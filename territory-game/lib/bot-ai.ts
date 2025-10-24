import type { GameState, Player, Cell, AttackOrder } from "./types"
import { STRUCTURE_DEFINITIONS, calculateDefenseMultiplier } from "./economy"

interface BotMemory {
  lastAttackTick: number
  targetPreference: { x: number; y: number } | null
  truceWith: Set<number>
}

const botMemories = new Map<number, BotMemory>()

function getBotMemory(botId: number): BotMemory {
  if (!botMemories.has(botId)) {
    botMemories.set(botId, {
      lastAttackTick: 0,
      targetPreference: null,
      truceWith: new Set(),
    })
  }
  return botMemories.get(botId)!
}

function getPlayerCells(state: GameState, playerId: number): Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < state.grid.length; y++) {
    for (let x = 0; x < state.grid[y].length; x++) {
      const cell = state.grid[y][x]
      if (cell.owner === playerId) {
        cells.push(cell)
      }
    }
  }
  return cells
}

function getNeighbors(state: GameState, x: number, y: number): Cell[] {
  const neighbors: Cell[] = []
  const directions = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]

  for (const [dx, dy] of directions) {
    const nx = x + dx
    const ny = y + dy
    if (ny >= 0 && ny < state.grid.length && nx >= 0 && nx < state.grid[ny].length) {
      neighbors.push(state.grid[ny][nx])
    }
  }

  return neighbors
}

function evaluateCellStrength(state: GameState, cell: Cell): number {
  if (cell.terrain === "water") return Number.POSITIVE_INFINITY

  const owner = state.players[cell.owner]
  if (!owner || !owner.isAlive) return 0

  // Cell balance + player balance factor + terrain defense
  let strength = cell.balance + owner.balance * 0.08

  if (cell.terrain === "mountain") strength *= 1.5
  else if (cell.terrain === "desert") strength *= 1.2

  if (cell.structure) {
    const def = STRUCTURE_DEFINITIONS[cell.structure]
    strength *= 1 + def.defenseBonus
  }

  strength *= 1 + calculateDefenseMultiplier(owner) * 0.05

  return strength
}

function findWeakestNeighbor(state: GameState, bot: Player): Cell | null {
  let weakest: { cell: Cell; strength: number } | null = null
  const botCells = getPlayerCells(state, bot.id)

  for (const cell of botCells) {
    const neighbors = getNeighbors(state, cell.x, cell.y)

    for (const neighbor of neighbors) {
      // Skip own cells and water
      if (neighbor.owner === bot.id || neighbor.terrain === "water") continue
      if (bot.alliances.includes(neighbor.owner)) continue

      // In free-land phase, only target neutral
      if (state.phase === "free-land" && neighbor.owner !== -1) continue

      const strength = evaluateCellStrength(state, neighbor)

      if (!weakest || strength < weakest.strength) {
        weakest = { cell: neighbor, strength }
      }
    }
  }

  return weakest?.cell ?? null
}

function detectOverextendedNeighbor(state: GameState, bot: Player): Cell | null {
  const memory = getBotMemory(bot.id)
  const botCells = getPlayerCells(state, bot.id)

  // Look for neighbors who have low balance relative to territory
  for (const player of state.players) {
    if (player.id === bot.id || !player.isAlive) continue
    if (bot.alliances.includes(player.id)) continue
    if (memory.truceWith.has(player.id)) continue

    const balancePerCell = player.balance / Math.max(1, player.cellCount)

    if (balancePerCell < 20) {
      // Find a border with this player
      for (const cell of botCells) {
        const neighbors = getNeighbors(state, cell.x, cell.y)
        for (const neighbor of neighbors) {
          if (neighbor.owner === player.id && neighbor.terrain !== "water") {
            return neighbor
          }
        }
      }
    }
  }

  return null
}

export function generateBotOrders(state: GameState): AttackOrder[] {
  const orders: AttackOrder[] = []

  state.players.forEach((bot) => {
    if (!bot.isBot || !bot.isAlive) return
    if (bot.balance < 50) return // Don't attack if too poor

    const memory = getBotMemory(bot.id)

    // Update truces
    if (bot.truceUntil && state.tick >= bot.truceUntil) {
      bot.truceUntil = undefined
      memory.truceWith.clear()
    }

    // Random truce declaration (5% chance per tick)
    if (!bot.truceUntil && Math.random() < 0.05) {
      bot.truceUntil = state.tick + 10 + Math.floor(Math.random() * 20)

      // Pick a random neighbor to truce with
      const neighbors = new Set<number>()
      const botCells = getPlayerCells(state, bot.id)

      for (const cell of botCells) {
        const neighborCells = getNeighbors(state, cell.x, cell.y)
        for (const neighbor of neighborCells) {
          if (neighbor.owner !== bot.id && neighbor.owner !== -1) {
            neighbors.add(neighbor.owner)
          }
        }
      }

      if (neighbors.size > 0) {
        const truceTarget = Array.from(neighbors)[Math.floor(Math.random() * neighbors.size)]
        memory.truceWith.add(truceTarget)
      }
    }

    // Decide attack frequency based on difficulty
    const attackChance = 0.3 + state.difficulty * 0.4
    if (Math.random() > attackChance) return

    // Throttle attacks
    if (state.tick - memory.lastAttackTick < 2) return

    let targetCell: Cell | null = null

    // Priority 1: Look for enemies not in alliance or truce
    targetCell = detectOverextendedNeighbor(state, bot)

    // Priority 2: Continue attacking preferred target
    if (!targetCell && memory.targetPreference !== null) {
      const { x, y } = memory.targetPreference
      const prefCell = state.grid[y][x]
      if (prefCell.owner !== bot.id && !bot.alliances.includes(prefCell.owner)) {
        targetCell = prefCell
      } else {
        memory.targetPreference = null
      }
    }

    // Priority 3: Find weakest neighbor
    if (!targetCell) {
      targetCell = findWeakestNeighbor(state, bot)
      if (targetCell) {
        memory.targetPreference = { x: targetCell.x, y: targetCell.y }
      }
    }

    if (!targetCell) return

    // Find a cell to attack from (one of bot's cells adjacent to target)
    let fromCell: Cell | null = null
    const neighbors = getNeighbors(state, targetCell.x, targetCell.y)

    for (const neighbor of neighbors) {
      if (neighbor.owner === bot.id) {
        fromCell = neighbor
        break
      }
    }

    if (!fromCell) return

    // Determine send percentage based on difficulty and situation
    let sendPercent = 0.25 + state.difficulty * 0.2

    // Be more aggressive on income ticks (every 5 ticks)
    if (state.tick % 5 === 0) {
      sendPercent += 0.15
    }

    // Cap at 60%
    sendPercent = Math.min(0.6, sendPercent)

    const amount = Math.floor(bot.balance * sendPercent)

    if (amount <= 0) return

    orders.push({
      fromX: fromCell.x,
      fromY: fromCell.y,
      toX: targetCell.x,
      toY: targetCell.y,
      amount,
      attackerId: bot.id,
    })

    memory.lastAttackTick = state.tick
  })
  return orders
}

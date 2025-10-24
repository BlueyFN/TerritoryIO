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

interface TargetCandidate {
  from: Cell
  target: Cell
  priority: number
  bucket: number
  neutral: boolean
}

function collectFrontierTargets(state: GameState, bot: Player, memory: BotMemory): TargetCandidate[] {
  const botCells = getPlayerCells(state, bot.id)
  if (botCells.length === 0) return []

  const centerX = botCells.reduce((sum, cell) => sum + cell.x, 0) / botCells.length
  const centerY = botCells.reduce((sum, cell) => sum + cell.y, 0) / botCells.length

  const targets = new Map<string, TargetCandidate>()

  for (const cell of botCells) {
    const neighbors = getNeighbors(state, cell.x, cell.y)

    for (const neighbor of neighbors) {
      if (neighbor.terrain === "water") continue
      if (neighbor.owner === bot.id) continue
      if (neighbor.owner >= 0 && bot.alliances.includes(neighbor.owner)) continue
      if (neighbor.owner >= 0 && memory.truceWith.has(neighbor.owner)) continue

      const strength =
        neighbor.owner === -1 ? neighbor.balance * 0.6 + 5 : evaluateCellStrength(state, neighbor)
      const isNeutral = neighbor.owner === -1
      const distance = Math.hypot(neighbor.x - centerX, neighbor.y - centerY)
      const fromPower = cell.balance

      let priority = strength
      priority += distance * 2.5
      priority -= Math.min(35, fromPower * 0.35)
      priority *= isNeutral ? 0.75 : 1.05

      const angle = Math.atan2(neighbor.y - centerY, neighbor.x - centerX)
      const bucket = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8)

      const key = `${neighbor.x}:${neighbor.y}`
      const existing = targets.get(key)
      if (!existing || priority < existing.priority) {
        targets.set(key, { from: cell, target: neighbor, priority, bucket, neutral: isNeutral })
      }
    }
  }

  return Array.from(targets.values())
}

function pickTargets(
  candidates: TargetCandidate[],
  limit: number,
  usedBuckets: Set<number>,
  usedTargets: Set<string>,
): TargetCandidate[] {
  if (limit <= 0 || candidates.length === 0) return []

  const sorted = candidates.slice().sort((a, b) => a.priority - b.priority)
  const selected: TargetCandidate[] = []

  for (const candidate of sorted) {
    if (selected.length >= limit) break
    const key = `${candidate.target.x}:${candidate.target.y}`
    if (usedTargets.has(key)) continue
    if (usedBuckets.has(candidate.bucket)) continue

    selected.push(candidate)
    usedBuckets.add(candidate.bucket)
    usedTargets.add(key)
  }

  if (selected.length < limit) {
    for (const candidate of sorted) {
      if (selected.length >= limit) break
      const key = `${candidate.target.x}:${candidate.target.y}`
      if (usedTargets.has(key)) continue

      selected.push(candidate)
      usedTargets.add(key)
      usedBuckets.add(candidate.bucket)
    }
  }

  return selected
}

export function generateBotOrders(state: GameState): AttackOrder[] {
  const orders: AttackOrder[] = []

  state.players.forEach((bot) => {
    if (!bot.isBot || !bot.isAlive) return
    if (bot.balance < 40) return // Don't attack if too poor

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
    const attackChance = 0.35 + state.difficulty * 0.35
    if (Math.random() > attackChance) return

    // Throttle attacks
    if (state.tick - memory.lastAttackTick < 2) return

    if (memory.targetPreference) {
      const pref = memory.targetPreference
      const prefCell = state.grid[pref.y]?.[pref.x]
      if (!prefCell || prefCell.owner === bot.id || bot.alliances.includes(prefCell.owner)) {
        memory.targetPreference = null
      }
    }

    const frontier = collectFrontierTargets(state, bot, memory)
    if (frontier.length === 0) {
      memory.targetPreference = null
      return
    }

    const overextended = detectOverextendedNeighbor(state, bot)
    if (overextended) {
      const candidate = frontier.find((c) => c.target.x === overextended.x && c.target.y === overextended.y)
      if (candidate) {
        candidate.priority *= 0.5
      }
    }

    if (memory.targetPreference) {
      const pref = memory.targetPreference
      const candidate = frontier.find((c) => c.target.x === pref.x && c.target.y === pref.y)
      if (candidate) {
        candidate.priority *= 0.65
      } else {
        memory.targetPreference = null
      }
    }

    const neutralTargets = frontier.filter((c) => c.neutral)
    const hostileTargets = frontier.filter((c) => !c.neutral)

    const maxOrders = Math.max(2, Math.min(5, Math.ceil(bot.cellCount / 12)))
    const usedBuckets = new Set<number>()
    const usedTargets = new Set<string>()
    const selected: TargetCandidate[] = []

    const neutralLimit = state.phase === "free-land" ? maxOrders : Math.max(1, Math.floor(maxOrders / 2))
    selected.push(...pickTargets(neutralTargets, neutralLimit, usedBuckets, usedTargets))

    if (selected.length < maxOrders && state.phase !== "free-land") {
      selected.push(...pickTargets(hostileTargets, maxOrders - selected.length, usedBuckets, usedTargets))
    }

    if (selected.length === 0) {
      memory.targetPreference = null
      return
    }

    let budget = bot.balance * (0.32 + state.difficulty * 0.28)
    budget = Math.max(25, Math.min(budget, bot.balance - 5))
    let remainingBudget = budget
    let issued = 0

    for (const target of selected) {
      if (remainingBudget <= 5) break
      const baseRatio = target.neutral ? 0.18 + state.difficulty * 0.12 : 0.3 + state.difficulty * 0.2
      const spendBase = Math.min(remainingBudget, bot.balance)
      const amount = Math.max(15, Math.floor(spendBase * baseRatio))
      if (amount <= 0) continue

      orders.push({
        fromX: target.from.x,
        fromY: target.from.y,
        toX: target.target.x,
        toY: target.target.y,
        amount,
        attackerId: bot.id,
      })

      remainingBudget -= amount
      issued++

      if (!target.neutral) {
        memory.targetPreference = { x: target.target.x, y: target.target.y }
      }
    }

    if (issued > 0) {
      memory.lastAttackTick = state.tick
    }
  })
  return orders
}

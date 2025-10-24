import type { GameState, Player, AttackOrder, Cell } from "./types"
import { generatePixelMap, getPlayerColors } from "./map-generator"
import {
  STRUCTURE_DEFINITIONS,
  UNIT_DEFINITIONS,
  applyUnitUpkeep,
  calculateAttackMultiplier,
  calculateDefenseMultiplier,
  createEmptyStructureTally,
  createEmptyUnitTally,
  updatePlayerMilitaryStrength,
} from "./economy"

function developBotEconomies(state: GameState) {
  const availableStructureTypes = Object.keys(STRUCTURE_DEFINITIONS) as (keyof typeof STRUCTURE_DEFINITIONS)[]
  state.players.forEach((player) => {
    if (!player.isBot || !player.isAlive) return

    const playerCells: Cell[] = []
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell.owner === player.id) {
          playerCells.push(cell)
        }
      }
    }

    if (player.balance > 160 && playerCells.length > 0) {
      const emptyCells = playerCells.filter((cell) => !cell.structure)
      if (emptyCells.length > 0) {
        const structureToBuild = availableStructureTypes
          .slice()
          .sort((a, b) => (player.structures[a] ?? 0) - (player.structures[b] ?? 0))[0]
        const definition = STRUCTURE_DEFINITIONS[structureToBuild]
        if (player.balance >= definition.cost) {
          const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
          cell.structure = structureToBuild
          player.balance -= definition.cost
        }
      }
    }

    const desiredUnit = (Object.keys(UNIT_DEFINITIONS) as (keyof typeof UNIT_DEFINITIONS)[]).reduce(
      (best, key) => {
        const current = player.units[key]
        if (!best) return key
        return player.units[key] < player.units[best] ? key : best
      },
      "infantry" as keyof typeof UNIT_DEFINITIONS,
    )

    const unitDef = UNIT_DEFINITIONS[desiredUnit]
    if (player.balance >= unitDef.cost && Math.random() < 0.6) {
      player.balance -= unitDef.cost
      player.units[desiredUnit] += 1
    }
  })
}

export function initializeGame(numBots: number, difficulty: number, mapType: "continent" | "archipelago"): GameState {
  const grid = generatePixelMap(mapType)
  const height = grid.length
  const width = grid[0].length

  const colors = getPlayerColors(numBots + 1)

  const players: Player[] = [
    {
      id: 0,
      balance: 100,
      income: 0,
      interestRate: 0.07,
      cellCount: 0,
      color: colors[0],
      name: "You",
      isBot: false,
      isAlive: true,
      structures: createEmptyStructureTally(),
      units: createEmptyUnitTally(),
      unitProgress: createEmptyUnitTally(),
      alliances: [],
      militaryStrength: 0,
    },
  ]

  for (let i = 1; i <= numBots; i++) {
    players.push({
      id: i,
      balance: 100,
      income: 0,
      interestRate: 0.07 + difficulty * 0.02,
      cellCount: 0,
      color: colors[i],
      name: `Bot ${i}`,
      isBot: true,
      isAlive: true,
      structures: createEmptyStructureTally(),
      units: createEmptyUnitTally(),
      unitProgress: createEmptyUnitTally(),
      alliances: [],
      militaryStrength: 0,
    })
  }

  // Assign starting positions (spread out on land)
  const landCells: { x: number; y: number }[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].terrain !== "water") {
        landCells.push({ x, y })
      }
    }
  }

  const spacing = Math.floor(landCells.length / players.length)
  players.forEach((player, i) => {
    const cell = landCells[i * spacing]
    if (cell) {
      grid[cell.y][cell.x].owner = player.id
      grid[cell.y][cell.x].balance = 50
      grid[cell.y][cell.x].structure = "city"
      player.cellCount = 1
    }
  })

  return {
    grid,
    width,
    height,
    players,
    tick: 0,
    phase: "free-land",
    winner: null,
    selectedCell: null,
    difficulty,
    mapType,
  }
}

export function processTick(state: GameState, orders: AttackOrder[]): GameState {
  const newState = structuredClone(state)
  newState.tick++

  if (newState.tick === 10 && newState.phase === "free-land") {
    newState.phase = "active"
  }

  developBotEconomies(newState)

  // Process attacks
  orders.forEach((order) => {
    const fromCell = newState.grid[order.fromY]?.[order.fromX]
    const toCell = newState.grid[order.toY]?.[order.toX]
    if (!fromCell || !toCell) return
    if (toCell.owner === -2 || fromCell.owner !== order.attackerId) return

    const attacker = newState.players[order.attackerId]
    const defender = toCell.owner >= 0 ? newState.players[toCell.owner] : undefined

    if (defender && attacker.alliances.includes(defender.id)) {
      // Betrayal breaks alliance immediately
      attacker.alliances = attacker.alliances.filter((id) => id !== defender.id)
      defender.alliances = defender.alliances.filter((id) => id !== attacker.id)
    }

    const terrainMultiplier =
      toCell.terrain === "mountain" ? 1.3 : toCell.terrain === "desert" ? 1.0 : toCell.terrain === "water" ? 1.5 : 0.9

    const structureDefense = toCell.structure ? 1 + STRUCTURE_DEFINITIONS[toCell.structure].defenseBonus : 1
    const attackStrength = order.amount * calculateAttackMultiplier(attacker)
    const defenseStrength =
      toCell.owner === -1
        ? toCell.balance * 0.6
        : toCell.balance * terrainMultiplier * structureDefense * (defender ? calculateDefenseMultiplier(defender) : 1)

    if (toCell.owner === -1) {
      toCell.owner = order.attackerId
      toCell.balance = Math.max(10, (attackStrength - defenseStrength) * 0.4)
      if (!toCell.structure && Math.random() < 0.5) {
        toCell.structure = "city"
      }
      return
    }

    if (attackStrength > defenseStrength) {
      toCell.owner = order.attackerId
      toCell.balance = Math.max(5, (attackStrength - defenseStrength) * 0.25)
      if (Math.random() < 0.3) {
        toCell.structure = null
      }
      if (defender) {
        for (const key of Object.keys(defender.units)) {
          const unitKey = key as keyof typeof defender.units
          defender.units[unitKey] = Math.max(0, defender.units[unitKey] - Math.ceil(defender.units[unitKey] * 0.15))
        }
      }
    } else {
      toCell.balance = Math.max(0, toCell.balance - attackStrength / terrainMultiplier)
      for (const key of Object.keys(attacker.units)) {
        const unitKey = key as keyof typeof attacker.units
        attacker.units[unitKey] = Math.max(0, attacker.units[unitKey] - Math.ceil(attacker.units[unitKey] * 0.1))
      }
    }
  })

  // Update player stats and apply income/interest
  newState.players.forEach((player) => {
    player.cellCount = 0
    player.income = 0
    player.structures = createEmptyStructureTally()
  })

  for (let y = 0; y < newState.height; y++) {
    for (let x = 0; x < newState.width; x++) {
      const cell = newState.grid[y][x]
      if (cell.owner >= 0) {
        const player = newState.players[cell.owner]
        player.cellCount++

        // Each cell generates income
        cell.balance += 1
        player.income += 1

        if (cell.structure) {
          const def = STRUCTURE_DEFINITIONS[cell.structure]
          player.structures[cell.structure] += 1
          player.income += def.income
          cell.balance += def.balanceBonus

          if (def.unitRate) {
            player.unitProgress[def.unitRate.type] += def.unitRate.perTick
            const ready = Math.floor(player.unitProgress[def.unitRate.type])
            if (ready > 0) {
              player.units[def.unitRate.type] += ready
              player.unitProgress[def.unitRate.type] -= ready
            }
          }
        }
      }
    }
  }

  // Apply interest to player balance
  newState.players.forEach((player) => {
    if (player.cellCount > 0) {
      player.balance += player.income
      const maxInterest = player.cellCount * 3
      const interest = Math.min(player.balance * player.interestRate, maxInterest)
      player.balance += interest
      applyUnitUpkeep(player)
      updatePlayerMilitaryStrength(player)
      player.isAlive = true
    } else {
      player.isAlive = false
    }
  })

  // Check win conditions
  const alivePlayers = newState.players.filter((p) => p.isAlive)
  const totalLand = newState.width * newState.height

  if (alivePlayers.length === 1) {
    newState.phase = "ended"
    newState.winner = alivePlayers[0].id
  } else {
    alivePlayers.forEach((player) => {
      if (player.cellCount / totalLand >= 0.72) {
        newState.phase = "ended"
        newState.winner = player.id
      }
    })
  }

  if (newState.tick >= 480 && newState.phase === "active") {
    const leader = alivePlayers.reduce((max, p) => (p.cellCount > max.cellCount ? p : max))
    newState.phase = "ended"
    newState.winner = leader.id
  }

  return newState
}

export function getNeighbors(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = []
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  dirs.forEach(([dx, dy]) => {
    const nx = x + dx
    const ny = y + dy
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      neighbors.push({ x: nx, y: ny })
    }
  })

  return neighbors
}

export function canAttackCell(state: GameState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  const fromCell = state.grid[fromY]?.[fromX]
  const toCell = state.grid[toY]?.[toX]

  if (!fromCell || !toCell) return false
  if (fromCell.owner !== 0) return false
  if (toCell.terrain === "water") return false
  if (toCell.owner === 0) return false

  const isNeighbor = Math.abs(fromX - toX) + Math.abs(fromY - toY) === 1
  if (!isNeighbor) return false

  if (state.phase === "free-land" && toCell.owner !== -1) return false

  return true
}

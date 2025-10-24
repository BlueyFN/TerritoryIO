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
  state.players.forEach((player) => {
    if (!player.isBot || !player.isAlive) return

    const structureCounts = createEmptyStructureTally()
    const playerCells: Cell[] = []
    const emptyCells: Cell[] = []
    const borderCells: Cell[] = []
    const coastalCells: Cell[] = []

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x]
        if (cell.owner !== player.id) continue

        playerCells.push(cell)
        if (cell.structure) {
          structureCounts[cell.structure] += 1
        } else {
          emptyCells.push(cell)
        }

        const neighbors = getNeighbors(x, y, state.width, state.height)
        let touchesEnemy = false
        let touchesWater = false
        for (const neighbor of neighbors) {
          const neighborCell = state.grid[neighbor.y][neighbor.x]
          if (neighborCell.terrain === "water") {
            touchesWater = true
          }
          if (
            neighborCell.owner >= 0 &&
            neighborCell.owner !== player.id &&
            !player.alliances.includes(neighborCell.owner)
          ) {
            touchesEnemy = true
          }
        }

        if (touchesEnemy) {
          borderCells.push(cell)
        }
        if (touchesWater) {
          coastalCells.push(cell)
        }
      }
    }

    if (playerCells.length === 0) return

    const economicReserve = Math.max(50, Math.floor(player.cellCount * 1.5))
    if (player.balance > economicReserve && emptyCells.length > 0) {
      let structureToBuild: keyof typeof STRUCTURE_DEFINITIONS | null = null
      let placementPool: Cell[] = emptyCells

      const desiredCity = Math.max(1, Math.ceil(player.cellCount / 10))
      const desiredBarracks = Math.max(1, Math.ceil(player.cellCount / 14))
      const desiredAntiAir = Math.max(1, Math.floor(player.cellCount / 18))
      const desiredNaval = state.mapType === "archipelago" ? Math.max(1, Math.floor(player.cellCount / 12)) : Math.floor(player.cellCount / 20)
      const desiredMissile = state.tick > 150 ? Math.max(1, Math.floor(player.cellCount / 26)) : 0

      if (structureCounts.city < desiredCity) {
        structureToBuild = "city"
      } else if (structureCounts.barracks < desiredBarracks) {
        structureToBuild = "barracks"
      } else if (borderCells.length > 0 && structureCounts.antiAir < desiredAntiAir) {
        structureToBuild = "antiAir"
        placementPool = borderCells
      } else if (
        state.mapType === "archipelago" &&
        coastalCells.length > 0 &&
        structureCounts.navalYard < desiredNaval
      ) {
        structureToBuild = "navalYard"
        placementPool = coastalCells
      } else if (desiredMissile > 0 && structureCounts.missileSilo < desiredMissile) {
        structureToBuild = "missileSilo"
        placementPool = borderCells.length > 0 ? borderCells : emptyCells
      }

      if (structureToBuild) {
        const definition = STRUCTURE_DEFINITIONS[structureToBuild]
        if (player.balance >= definition.cost) {
          const candidates = placementPool.filter((cell) => !cell.structure)
          const targetPool = candidates.length > 0 ? candidates : emptyCells
          const target = targetPool[Math.floor(Math.random() * targetPool.length)]
          if (target) {
            target.structure = structureToBuild
            player.balance -= definition.cost
            structureCounts[structureToBuild] += 1
          }
        }
      }
    }

    const enemyStrength = state.players
      .filter((opponent) => opponent.id !== player.id && opponent.isAlive && !player.alliances.includes(opponent.id))
      .reduce((max, opponent) => Math.max(max, opponent.militaryStrength), 0)

    const desiredUnits: Record<keyof typeof UNIT_DEFINITIONS, number> = {
      infantry: Math.max(1, Math.ceil(player.cellCount / 3)),
      tank: Math.max(1, Math.floor(player.cellCount / 6)),
      antiAir: Math.max(1, Math.floor(player.cellCount / 12)),
      naval: state.mapType === "archipelago" ? Math.max(1, Math.floor(player.cellCount / 9)) : Math.floor(player.cellCount / 18),
      missile: state.tick > 160 ? Math.max(1, Math.floor(player.cellCount / 25)) : 0,
    }

    const unitPriority = (Object.keys(UNIT_DEFINITIONS) as (keyof typeof UNIT_DEFINITIONS)[])
      .map((type) => {
        const desired = desiredUnits[type] ?? 0
        const current = player.units[type]
        const ratio = desired === 0 ? 1.5 : current / desired
        return { type, desired, ratio }
      })
      .sort((a, b) => a.ratio - b.ratio)

    const pressure = enemyStrength > player.militaryStrength * 0.85
    for (const { type, desired } of unitPriority) {
      if (desired <= 0) continue
      if (!pressure && player.units[type] >= desired) continue
      const def = UNIT_DEFINITIONS[type]
      if (player.balance >= def.cost + Math.max(0, economicReserve / 3)) {
        player.balance -= def.cost
        player.units[type] += 1
        if (pressure && player.balance >= def.cost && Math.random() < 0.4) {
          continue
        }
        break
      }
    }
  })
}

export function initializeGame(
  numBots: number,
  difficulty: number,
  mapType: "continent" | "archipelago",
  mapWidth = 120,
  mapHeight = 80,
): GameState {
  const grid = generatePixelMap(mapType, Math.random() * 10000, mapWidth, mapHeight)
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

    if (order.sourceDrain === undefined) {
      fromCell.balance = Math.max(0, fromCell.balance - Math.max(1, Math.floor(order.amount * 0.6)))
    }

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

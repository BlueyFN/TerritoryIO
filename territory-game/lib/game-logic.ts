import type { GameState, Player, AttackOrder } from "./types"
import { generatePixelMap, getPlayerColors } from "./map-generator"

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

  // Process attacks
  orders.forEach((order) => {
    const fromCell = newState.grid[order.fromY][order.fromX]
    const toCell = newState.grid[order.toY][order.toX]

    if (toCell.owner === -1) {
      // Neutral territory
      toCell.owner = order.attackerId
      toCell.balance = order.amount * 0.5
    } else if (toCell.owner !== order.attackerId) {
      // Enemy territory
      const terrainMultiplier = toCell.terrain === "mountain" ? 1.2 : toCell.terrain === "desert" ? 1.0 : 0.85
      const defenseStrength = toCell.balance * terrainMultiplier

      if (order.amount > defenseStrength) {
        toCell.owner = order.attackerId
        toCell.balance = (order.amount - defenseStrength) * 0.3
      } else {
        toCell.balance -= order.amount / terrainMultiplier
      }
    }
  })

  // Update player stats and apply income/interest
  newState.players.forEach((player) => {
    player.cellCount = 0
    player.income = 0
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
      }
    }
  }

  // Apply interest to player balance
  newState.players.forEach((player) => {
    if (player.cellCount > 0) {
      const maxInterest = player.cellCount * 3
      const interest = Math.min(player.balance * player.interestRate, maxInterest)
      player.balance += interest
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

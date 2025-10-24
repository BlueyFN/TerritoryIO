export interface Cell {
  x: number
  y: number
  terrain: "plains" | "desert" | "mountain" | "water"
  owner: number // -1 = neutral, 0 = player, 1+ = bots
  balance: number // each cell has its own balance
  structure: StructureType | null
}

export interface Player {
  id: number
  balance: number
  income: number
  interestRate: number
  cellCount: number
  color: string
  name: string
  isBot: boolean
  isAlive: boolean
  truceUntil?: number
  structures: Record<StructureType, number>
  units: Record<UnitType, number>
  unitProgress: Record<UnitType, number>
  alliances: number[]
  militaryStrength: number
}

export interface AttackOrder {
  fromX: number
  fromY: number
  toX: number
  toY: number
  amount: number
  attackerId: number
  sourceDrain?: number
}

export interface GameState {
  grid: Cell[][]
  width: number
  height: number
  players: Player[]
  tick: number
  phase: "free-land" | "active" | "ended"
  winner: number | null
  selectedCell: { x: number; y: number } | null
  difficulty: number
  mapType: "continent" | "archipelago"
}

export interface TerrainType {
  name: string
  color: string
  troopLoss: number
  speedPenalty: number
}

export type StructureType =
  | "city"
  | "barracks"
  | "antiAir"
  | "navalYard"
  | "missileSilo"

export type UnitType = "infantry" | "tank" | "antiAir" | "naval" | "missile"

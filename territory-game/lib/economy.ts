import type { StructureType, UnitType, Player } from "./types"

interface StructureDefinition {
  name: string
  cost: number
  income: number
  balanceBonus: number
  defenseBonus: number
  unitRate?: { type: UnitType; perTick: number }
}

interface UnitDefinition {
  name: string
  cost: number
  attackBonus: number
  defenseBonus: number
  upkeep: number
}

export const STRUCTURE_DEFINITIONS: Record<StructureType, StructureDefinition> = {
  city: {
    name: "City Center",
    cost: 95,
    income: 5,
    balanceBonus: 4,
    defenseBonus: 0.2,
  },
  barracks: {
    name: "Barracks",
    cost: 70,
    income: 1,
    balanceBonus: 1,
    defenseBonus: 0.05,
    unitRate: { type: "infantry", perTick: 0.4 },
  },
  antiAir: {
    name: "Air Defense",
    cost: 95,
    income: 0,
    balanceBonus: 0,
    defenseBonus: 0.35,
    unitRate: { type: "antiAir", perTick: 0.1 },
  },
  navalYard: {
    name: "Naval Yard",
    cost: 100,
    income: 2,
    balanceBonus: 1,
    defenseBonus: 0.15,
    unitRate: { type: "naval", perTick: 0.15 },
  },
  missileSilo: {
    name: "Missile Silo",
    cost: 160,
    income: 0,
    balanceBonus: 0,
    defenseBonus: 0.05,
    unitRate: { type: "missile", perTick: 0.05 },
  },
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  infantry: {
    name: "Infantry Division",
    cost: 25,
    attackBonus: 0.02,
    defenseBonus: 0.015,
    upkeep: 0.5,
  },
  tank: {
    name: "Armored Company",
    cost: 60,
    attackBonus: 0.05,
    defenseBonus: 0.03,
    upkeep: 1,
  },
  antiAir: {
    name: "Anti-Air Battery",
    cost: 55,
    attackBonus: 0.01,
    defenseBonus: 0.05,
    upkeep: 0.8,
  },
  naval: {
    name: "Naval Fleet",
    cost: 70,
    attackBonus: 0.06,
    defenseBonus: 0.04,
    upkeep: 1.1,
  },
  missile: {
    name: "Strategic Missile",
    cost: 120,
    attackBonus: 0.12,
    defenseBonus: 0.02,
    upkeep: 1.5,
  },
}

export function createEmptyStructureTally(): Record<StructureType, number> {
  return {
    city: 0,
    barracks: 0,
    antiAir: 0,
    navalYard: 0,
    missileSilo: 0,
  }
}

export function createEmptyUnitTally(): Record<UnitType, number> {
  return {
    infantry: 0,
    tank: 0,
    antiAir: 0,
    naval: 0,
    missile: 0,
  }
}

export function calculateAttackMultiplier(player: Player): number {
  let multiplier = 1
  for (const [unitKey, count] of Object.entries(player.units) as [UnitType, number][]) {
    const def = UNIT_DEFINITIONS[unitKey]
    multiplier += count * def.attackBonus
  }
  return Math.max(1, multiplier)
}

export function calculateDefenseMultiplier(player: Player): number {
  let multiplier = 1
  for (const [unitKey, count] of Object.entries(player.units) as [UnitType, number][]) {
    const def = UNIT_DEFINITIONS[unitKey]
    multiplier += count * def.defenseBonus
  }
  return Math.max(1, multiplier)
}

export function calculateUnitUpkeep(player: Player): number {
  let upkeep = 0
  for (const [unitKey, count] of Object.entries(player.units) as [UnitType, number][]) {
    const def = UNIT_DEFINITIONS[unitKey]
    upkeep += count * def.upkeep
  }
  return upkeep
}

export function applyUnitUpkeep(player: Player): number {
  const upkeep = calculateUnitUpkeep(player)
  player.balance = Math.max(0, player.balance - upkeep)
  return upkeep
}

export function updatePlayerMilitaryStrength(player: Player) {
  player.militaryStrength = Object.entries(player.units).reduce((sum, [unitKey, count]) => {
    const def = UNIT_DEFINITIONS[unitKey as UnitType]
    return sum + count * (def.attackBonus + def.defenseBonus) * 50
  }, 0)
}

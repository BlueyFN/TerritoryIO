"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { Cell, Player, StructureType, UnitType } from "@/lib/types"
import { STRUCTURE_DEFINITIONS, UNIT_DEFINITIONS, calculateUnitUpkeep } from "@/lib/economy"
import { useMemo, useState } from "react"

interface ControlPanelProps {
  selectedCell: Cell | null
  targetCell: { x: number; y: number } | null
  onSend: (percent: number) => void
  onBuildStructure: (structure: StructureType) => void
  onTrainUnit: (unit: UnitType) => void
  onToggleAlliance: (botId: number) => void
  player: Player
  bots: Player[]
  gamePhase: string
}

export function ControlPanel({
  selectedCell,
  targetCell,
  onSend,
  onBuildStructure,
  onTrainUnit,
  onToggleAlliance,
  player,
  bots,
  gamePhase,
}: ControlPanelProps) {
  const [customPercent, setCustomPercent] = useState(25)
  const presets = [
    { label: "10%", value: 0.1 },
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "60%", value: 0.6 },
  ]

  const selectedCellSummary = useMemo(() => {
    if (!selectedCell) return null
    return {
      balance: Math.floor(selectedCell.balance),
      structure: selectedCell.structure,
      owner: selectedCell.owner,
    }
  }, [selectedCell])

  const unitUpkeep = useMemo(() => calculateUnitUpkeep(player), [player])
  const netIncome = useMemo(() => player.income - unitUpkeep, [player.income, unitUpkeep])
  const structureSummary = useMemo(
    () =>
      (Object.keys(STRUCTURE_DEFINITIONS) as StructureType[])
        .map((structure) => ({
          type: structure,
          count: player.structures[structure] ?? 0,
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count),
    [player.structures],
  )
  const interestPreview = useMemo(
    () => Math.min(player.balance * player.interestRate, player.cellCount * 3),
    [player.balance, player.cellCount, player.interestRate],
  )
  const selectedStructureDef = selectedCellSummary?.structure
    ? STRUCTURE_DEFINITIONS[selectedCellSummary.structure]
    : null
  const availableForce = selectedCellSummary
    ? Math.max(0, Math.min(player.balance, selectedCellSummary.balance))
    : player.balance
  const isAttackDisabled = !targetCell || gamePhase === "ended" || availableForce < 1

  return (
    <div className="flex h-full flex-col gap-6 p-6 text-sm text-gray-200">
      <div className="space-y-3 rounded-lg border border-gray-800/80 bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected Tile</h3>
          {selectedCell && (
            <span className="text-xs text-gray-500">
              ({selectedCell.x}, {selectedCell.y})
            </span>
          )}
        </div>
        {!selectedCell && (
          <p className="text-xs leading-relaxed text-gray-500">
            Click one of your territories to review its economy and deploy new infrastructure.
          </p>
        )}
        {selectedCell && selectedCell.owner !== 0 && (
          <p className="text-xs leading-relaxed text-red-400">
            You must capture this tile before you can develop it.
          </p>
        )}
        {selectedCellSummary && selectedCell?.owner === 0 && (
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Terrain</div>
              <div className="font-semibold text-gray-100">{selectedCell.terrain}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Local Reserves</div>
              <div className="font-semibold text-green-400">${selectedCellSummary.balance}</div>
              <div className="text-[10px] text-gray-500">Fuel for outgoing assaults.</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Structure</div>
              <div className="font-semibold text-gray-100">{selectedStructureDef?.name ?? "None"}</div>
              {selectedStructureDef && (
                <div className="text-[10px] text-gray-500">
                  +{selectedStructureDef.income} income · +{Math.round(selectedStructureDef.defenseBonus * 100)}% defense
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Orders</div>
              {targetCell ? (
                <div className="font-semibold text-[#00d9ff]">
                  Target locked: ({targetCell.x}, {targetCell.y})
                </div>
              ) : (
                <div className="text-gray-500">Select a neighbour to engage</div>
              )}
              <div className="text-[10px] text-gray-500">
                {availableForce > 0
                  ? `Ready forces: ${Math.floor(availableForce)}`
                  : "Reinforcements required before launching."}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800/80 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nation Economy</h3>
          <span className="text-xs text-gray-500">Interest next tick: +${interestPreview.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Income per tick</div>
            <div className="text-sm font-semibold text-green-400">+${Math.round(player.income)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Unit upkeep</div>
            <div className="text-sm font-semibold text-red-400">-${unitUpkeep.toFixed(1)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Net change</div>
            <div className={netIncome >= 0 ? "text-sm font-semibold text-[#7fe9ff]" : "text-sm font-semibold text-red-400"}>
              {netIncome >= 0 ? "+" : ""}{netIncome.toFixed(1)} / tick
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Treasury</div>
            <div className="text-sm font-semibold text-gray-100">${Math.floor(player.balance)}</div>
          </div>
        </div>
        <div className="rounded-md border border-gray-800/70 bg-[#101010] p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Structure inventory</h4>
          {structureSummary.length === 0 ? (
            <p className="mt-1 text-[11px] text-gray-500">Construct buildings to amplify income and unlock unit production.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-[11px] text-gray-300">
              {structureSummary.map((entry) => {
                const def = STRUCTURE_DEFINITIONS[entry.type]
                return (
                  <li key={entry.type} className="flex items-center justify-between">
                    <span>{def.name}</span>
                    <span className="text-gray-400">×{entry.count}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800/80 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assault Orders</h3>
          <div className="text-xs text-gray-500">Balance: ${Math.floor(player.balance)}</div>
        </div>
        {!targetCell && (
          <p className="text-xs text-gray-500">
            Select a friendly tile, then choose a neutral or hostile neighbour to arm an attack.
          </p>
        )}
        {targetCell && availableForce < 1 && (
          <p className="text-xs text-red-400">
            This tile has no reserves to deploy. Allow it to accumulate balance or redirect income before striking.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              onClick={() => onSend(preset.value)}
              disabled={isAttackDisabled}
              size="sm"
              className="flex h-16 flex-col items-start justify-center gap-1 rounded-md border border-[#00d9ff]/30 bg-[#07242c] text-left text-[#00d9ff] hover:bg-[#09303a] disabled:opacity-40"
            >
              <span className="text-base font-semibold">{preset.label}</span>
              <span className="text-[11px] text-[#7fe9ff]">
                ${Math.floor(availableForce * preset.value)} committed
              </span>
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Custom allocation</span>
            <span>{customPercent}%</span>
          </div>
          <Slider
            value={[customPercent]}
            onValueChange={([value]) => setCustomPercent(value)}
            min={1}
            max={80}
            step={1}
            disabled={isAttackDisabled}
          />
          <Button
            onClick={() => onSend(customPercent / 100)}
            disabled={isAttackDisabled}
            className="w-full bg-[#1d1d1d] hover:bg-[#292929]"
          >
            Launch {customPercent}% strike (${Math.floor((availableForce * customPercent) / 100)})
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800/80 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Infrastructure</h3>
          <span className="text-xs text-gray-500">City reserves: ${Math.floor(player.balance)}</span>
        </div>
        {!selectedCellSummary || selectedCell?.owner !== 0 ? (
          <p className="text-xs text-gray-500">Select your own territory to place structures.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(STRUCTURE_DEFINITIONS) as StructureType[]).map((structure) => {
              const def = STRUCTURE_DEFINITIONS[structure]
              const canAfford = player.balance >= def.cost
              return (
                <Button
                  key={structure}
                  variant="outline"
                  onClick={() => onBuildStructure(structure)}
                  disabled={!canAfford || gamePhase === "ended"}
                  className="h-full w-full items-start justify-between gap-2 rounded-md border-gray-700 bg-[#121212] px-4 py-3 text-left hover:bg-[#1b1b1b]"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-100">{def.name}</div>
                    <div className="text-[11px] text-gray-400">Cost: ${def.cost}</div>
                  </div>
                  <div className="text-[10px] text-green-400">+{def.income} income</div>
                </Button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-gray-800/80 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Forces & Alliances</h3>
          <span className="text-xs text-gray-500">Military score: {Math.round(player.militaryStrength)}</span>
        </div>
        <div className="text-[11px] text-gray-500">
          Upkeep this turn: <span className="text-red-400">-${unitUpkeep.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(UNIT_DEFINITIONS) as UnitType[]).map((unit) => {
            const def = UNIT_DEFINITIONS[unit]
            const count = player.units[unit]
            return (
              <Button
                key={unit}
                onClick={() => onTrainUnit(unit)}
                disabled={player.balance < def.cost || gamePhase === "ended"}
                className="flex h-full flex-col items-start justify-center gap-1 rounded-md bg-[#161616] px-4 py-3 text-left hover:bg-[#1f1f1f] disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-gray-100">{def.name}</span>
                <span className="text-[11px] text-gray-400">Cost: ${def.cost}</span>
                <span className="text-[11px] text-[#00d9ff]">Active: {count}</span>
              </Button>
            )
          })}
        </div>
        <div className="space-y-2 rounded-md border border-gray-800/70 bg-[#101010] p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Diplomacy</h4>
          {bots.length === 0 && <p className="text-xs text-gray-500">No active opponents detected.</p>}
          {bots.map((bot) => {
            const allied = player.alliances.includes(bot.id)
            return (
              <div key={bot.id} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{bot.name}</div>
                  <div className="text-[10px] text-gray-500">Power {Math.round(bot.militaryStrength)}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onToggleAlliance(bot.id)}
                  className={
                    allied
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }
                >
                  {allied ? "Break" : "Propose"}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

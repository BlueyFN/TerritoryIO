"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { Cell, Player, StructureType, UnitType } from "@/lib/types"
import { STRUCTURE_DEFINITIONS, UNIT_DEFINITIONS } from "@/lib/economy"
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

  const isAttackDisabled = !targetCell || gamePhase === "ended"
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
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Terrain</div>
              <div className="font-semibold text-gray-100">{selectedCell.terrain}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Tile Balance</div>
              <div className="font-semibold text-green-400">${selectedCellSummary.balance}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Structure</div>
              <div className="font-semibold text-gray-100">
                {selectedCellSummary.structure ? STRUCTURE_DEFINITIONS[selectedCellSummary.structure].name : "None"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Orders</div>
              {targetCell ? (
                <div className="font-semibold text-[#00d9ff]">
                  Target locked: ({targetCell.x}, {targetCell.y})
                </div>
              ) : (
                <div className="text-gray-500">Select a neighbour to engage</div>
              )}
            </div>
          </div>
        )}
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
              <span className="text-[11px] text-[#7fe9ff]">${Math.floor(player.balance * preset.value)}</span>
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
            Launch {customPercent}% strike
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

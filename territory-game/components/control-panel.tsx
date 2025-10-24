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
    <div className="bg-[#0f0f0f] border-t border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto grid gap-6 md:grid-cols-3">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Assault Orders</h3>
            {!targetCell && (
              <p className="text-xs text-gray-500 mt-2">
                Select one of your cells, then choose an adjacent enemy or neutral tile to plan an attack.
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                onClick={() => onSend(preset.value)}
                disabled={isAttackDisabled}
                size="sm"
                className="flex-1 min-w-[88px] bg-[#00d9ff] text-black hover:bg-[#00b8dd] disabled:opacity-50"
              >
                <div className="text-left">
                  <div className="text-base font-bold">{preset.label}</div>
                  <div className="text-[10px] opacity-80">${Math.floor(player.balance * preset.value)}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Slider
              value={[customPercent]}
              onValueChange={([value]) => setCustomPercent(value)}
              min={1}
              max={80}
              step={1}
              disabled={isAttackDisabled}
            />
            <Button onClick={() => onSend(customPercent / 100)} disabled={isAttackDisabled} className="bg-gray-700">
              Send {customPercent}%
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Territory Management</h3>
            {!selectedCellSummary && <p className="text-xs text-gray-500 mt-2">Select one of your cells to build structures.</p>}
            {selectedCellSummary && selectedCell?.owner === 0 && (
              <div className="text-xs text-gray-400 mt-2 space-y-1">
                <div>Balance on tile: ${selectedCellSummary.balance}</div>
                <div>
                  Structure: {selectedCellSummary.structure ? STRUCTURE_DEFINITIONS[selectedCellSummary.structure].name : "None"}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(STRUCTURE_DEFINITIONS) as StructureType[]).map((structure) => {
              const def = STRUCTURE_DEFINITIONS[structure]
              const isOwnedCell = selectedCell?.owner === 0
              const canAfford = player.balance >= def.cost
              return (
                <Button
                  key={structure}
                  variant="outline"
                  onClick={() => onBuildStructure(structure)}
                  disabled={!isOwnedCell || !canAfford || gamePhase === "ended"}
                  className="flex flex-col items-start h-full text-left border-gray-700 bg-[#141414] hover:bg-[#1c1c1c]"
                >
                  <span className="font-semibold text-sm text-gray-100">{def.name}</span>
                  <span className="text-[10px] text-gray-400">Cost: ${def.cost}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Army & Diplomacy</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(Object.keys(UNIT_DEFINITIONS) as UnitType[]).map((unit) => {
                const def = UNIT_DEFINITIONS[unit]
                const count = player.units[unit]
                return (
                  <Button
                    key={unit}
                    onClick={() => onTrainUnit(unit)}
                    disabled={player.balance < def.cost || gamePhase === "ended"}
                    className="flex flex-col items-start h-full bg-[#1d1d1d] hover:bg-[#242424]"
                  >
                    <span className="text-sm font-semibold text-gray-100">{def.name}</span>
                    <span className="text-[10px] text-gray-400">Cost: ${def.cost}</span>
                    <span className="text-[10px] text-[#00d9ff]">Owned: {count}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="border border-gray-800 rounded-md p-3 bg-[#131313] space-y-2">
            <h4 className="text-xs font-semibold text-gray-300 uppercase">Alliances</h4>
            {bots.length === 0 && <p className="text-xs text-gray-500">No active opponents.</p>}
            {bots.map((bot) => {
              const allied = player.alliances.includes(bot.id)
              return (
                <div key={bot.id} className="flex items-center justify-between text-xs text-gray-300">
                  <div>
                    <div className="font-semibold text-sm text-white">{bot.name}</div>
                    <div className="text-[10px] text-gray-500">Power: {Math.round(bot.militaryStrength)}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onToggleAlliance(bot.id)}
                    className={allied ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"}
                  >
                    {allied ? "Break" : "Propose"}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

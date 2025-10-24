"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"

interface ControlPanelProps {
  selectedBorder: { from: number; to: number } | null
  onSend: (percent: number) => void
  playerBalance: number
  gamePhase: string
}

export function ControlPanel({ selectedBorder, onSend, playerBalance, gamePhase }: ControlPanelProps) {
  const [customPercent, setCustomPercent] = useState(25)

  const isDisabled = !selectedBorder || gamePhase === "ended"

  const presets = [
    { label: "10%", value: 0.1 },
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "60%", value: 0.6 },
  ]

  return (
    <div className="bg-[#0f0f0f] border-t border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {!selectedBorder && (
          <div className="text-center text-gray-500 py-4">
            Select one of your territories, then click a neighbor to attack
          </div>
        )}

        {selectedBorder && (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-400">Selected border - Choose attack strength</div>

            {/* Quick send buttons */}
            <div className="flex gap-3 justify-center">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  onClick={() => onSend(preset.value)}
                  disabled={isDisabled}
                  size="lg"
                  className="min-w-24 bg-[#00d9ff] text-black hover:bg-[#00b8dd] disabled:opacity-50"
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">{preset.label}</div>
                    <div className="text-xs opacity-80">${Math.floor(playerBalance * preset.value)}</div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom slider */}
            <div className="flex items-center gap-4 max-w-md mx-auto">
              <div className="flex-1">
                <Slider
                  value={[customPercent]}
                  onValueChange={([value]) => setCustomPercent(value)}
                  min={1}
                  max={60}
                  step={1}
                  disabled={isDisabled}
                />
              </div>
              <Button
                onClick={() => onSend(customPercent / 100)}
                disabled={isDisabled}
                className="min-w-32 bg-gray-700 hover:bg-gray-600"
              >
                Send {customPercent}%
                <div className="text-xs opacity-70 ml-2">${Math.floor(playerBalance * (customPercent / 100))}</div>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

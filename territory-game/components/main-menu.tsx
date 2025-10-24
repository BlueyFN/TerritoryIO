"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface MainMenuProps {
  onStart: (config: {
    numBots: number
    difficulty: number
    mapType: "continent" | "archipelago"
    mapWidth: number
    mapHeight: number
  }) => void
}

const MAP_OPTIONS = [
  { label: "Standard", description: "120 × 80 — balanced", width: 120, height: 80 },
  { label: "Expanded", description: "160 × 110 — longer wars", width: 160, height: 110 },
  { label: "World", description: "220 × 160 — epic campaigns", width: 220, height: 160 },
]

export function MainMenu({ onStart }: MainMenuProps) {
  const [numBots, setNumBots] = useState(25)
  const [difficulty, setDifficulty] = useState(0.5)
  const [mapType, setMapType] = useState<"continent" | "archipelago">("continent")
  const [mapIndex, setMapIndex] = useState(0)

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-[#00d9ff]">Territory</h1>
          <p className="text-gray-400">Fast-paced strategy conquest</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm text-gray-300">Map Type</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={mapType === "continent" ? "default" : "outline"}
                onClick={() => setMapType("continent")}
                className="h-20"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">Continent</div>
                  <div className="text-xs text-gray-400">Dense landmass</div>
                </div>
              </Button>
              <Button
                variant={mapType === "archipelago" ? "default" : "outline"}
                onClick={() => setMapType("archipelago")}
                className="h-20"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">Archipelago</div>
                  <div className="text-xs text-gray-400">Island chains</div>
                </div>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-gray-300">Map Size</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {MAP_OPTIONS.map((option, index) => (
                <Button
                  key={option.label}
                  variant={mapIndex === index ? "default" : "outline"}
                  onClick={() => setMapIndex(index)}
                  className="h-24"
                >
                  <div className="text-center">
                    <div className="text-base font-semibold">{option.label}</div>
                    <div className="text-xs text-gray-400">{option.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm text-gray-300">Opponents</label>
              <span className="text-sm text-[#00d9ff] font-semibold">{numBots} bots</span>
            </div>
            <Slider
              value={[numBots]}
              onValueChange={([value]) => setNumBots(value)}
              min={10}
              max={40}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm text-gray-300">Difficulty</label>
              <span className="text-sm text-[#00d9ff] font-semibold">
                {difficulty < 0.33 ? "Easy" : difficulty < 0.66 ? "Medium" : "Hard"}
              </span>
            </div>
            <Slider
              value={[difficulty * 100]}
              onValueChange={([value]) => setDifficulty(value / 100)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <Button
            onClick={() =>
              onStart({
                numBots,
                difficulty,
                mapType,
                mapWidth: MAP_OPTIONS[mapIndex].width,
                mapHeight: MAP_OPTIONS[mapIndex].height,
              })
            }
            className="w-full h-14 text-lg font-semibold bg-[#00d9ff] text-black hover:bg-[#00b8dd]"
          >
            Start Game
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500">Match length: 5-8 minutes</div>
      </div>
    </div>
  )
}

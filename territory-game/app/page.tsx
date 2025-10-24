"use client"

import { useState } from "react"
import { GameCanvas } from "@/components/game-canvas"
import { MainMenu } from "@/components/main-menu"
import { HelpOverlay } from "@/components/help-overlay"

export default function Home() {
  const [gameConfig, setGameConfig] = useState<{
    numBots: number
    difficulty: number
    mapType: "continent" | "archipelago"
    mapWidth: number
    mapHeight: number
  } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [gameKey, setGameKey] = useState(0)

  const handleStartGame = (config: {
    numBots: number
    difficulty: number
    mapType: "continent" | "archipelago"
    mapWidth: number
    mapHeight: number
  }) => {
    setGameConfig(config)
    setShowHelp(true)
  }

  const handleRestart = () => {
    setGameKey((prev) => prev + 1)
    setGameConfig(null)
  }

  if (!gameConfig) {
    return <MainMenu onStart={handleStartGame} />
  }

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] overflow-hidden">
      <GameCanvas key={gameKey} config={gameConfig} onRestart={handleRestart} />
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  )
}

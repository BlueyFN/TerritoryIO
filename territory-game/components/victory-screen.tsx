"use client"

import { Button } from "@/components/ui/button"
import type { GameState } from "@/lib/types"

interface VictoryScreenProps {
  gameState: GameState
  onRestart: () => void
}

export function VictoryScreen({ gameState, onRestart }: VictoryScreenProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winner)
  const isPlayerWinner = gameState.winner === 0

  const minutes = Math.floor(gameState.tick / 60)
  const seconds = gameState.tick % 60

  const player = gameState.players[0]
  const totalLandCells = gameState.grid.reduce(
    (total, row) => total + row.filter((cell) => cell.terrain !== "water").length,
    0,
  )
  const controlledCells = player?.cellCount ?? 0
  const controlPercent = totalLandCells
    ? ((controlledCells / totalLandCells) * 100).toFixed(1)
    : "0.0"

  const finalBalance = Math.floor(player?.balance ?? 0)

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="w-full max-w-lg p-8 space-y-8 text-center">
        <div className="space-y-4">
          {isPlayerWinner ? (
            <>
              <h1 className="text-6xl font-bold text-[#00d9ff] animate-pulse">Victory!</h1>
              <p className="text-xl text-gray-300">You conquered the map</p>
            </>
          ) : (
            <>
              <h1 className="text-6xl font-bold text-red-400">Defeated</h1>
              <p className="text-xl text-gray-300">{winner?.name} conquered the map</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-800">
          <div>
            <div className="text-sm text-gray-400">Time</div>
            <div className="text-2xl font-bold text-white">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Final Balance</div>
            <div className="text-2xl font-bold text-[#00d9ff]">${finalBalance}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Cells Controlled</div>
            <div className="text-2xl font-bold text-white">{controlledCells}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Control</div>
            <div className="text-2xl font-bold text-white">{controlPercent}%</div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRestart}
            className="w-full h-14 text-lg font-semibold bg-[#00d9ff] text-black hover:bg-[#00b8dd]"
          >
            Play Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12">
            Main Menu
          </Button>
        </div>
      </div>
    </div>
  )
}

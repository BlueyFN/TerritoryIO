"use client"

import { useEffect, useRef } from "react"
import type { GameState } from "@/lib/types"

interface MinimapProps {
  gameState: GameState
}

export function Minimap({ gameState }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = 200
    const height = 160
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, width, height)

    // Calculate scale to fit grid in minimap
    const gridWidth = gameState.grid[0].length
    const gridHeight = gameState.grid.length
    const cellWidth = width / gridWidth
    const cellHeight = height / gridHeight

    // Draw each cell
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const cell = gameState.grid[y][x]

        // Skip water cells
        if (cell.terrain === "water") {
          ctx.fillStyle = "#0a0a0a"
        } else if (cell.owner !== null) {
          // Owned cell - use player color
          const player = gameState.players[cell.owner]
          ctx.fillStyle = player?.color || "#2a2a2a"
        } else {
          // Neutral land
          ctx.fillStyle = "#2a2a2a"
        }

        ctx.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight))
      }
    }
  }, [gameState])

  return (
    <div className="absolute top-20 right-4 border-2 border-gray-700 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm">
      <canvas ref={canvasRef} className="w-[200px] h-[160px]" />
    </div>
  )
}

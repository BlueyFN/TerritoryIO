"use client"

import { useEffect, useRef } from "react"
import type { GameState } from "@/lib/types"

interface MinimapProps {
  gameState: GameState
  pan: { x: number; y: number }
  zoom: number
  baseCellSize: number
  viewportWidth: number
  viewportHeight: number
}

export function Minimap({ gameState, pan, zoom, baseCellSize, viewportWidth, viewportHeight }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = 220
    const height = 180
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

    // Draw current camera viewport
    const visibleCellsWidth = Math.min(gridWidth, viewportWidth / (baseCellSize * zoom))
    const visibleCellsHeight = Math.min(gridHeight, viewportHeight / (baseCellSize * zoom))

    const maxStartX = Math.max(0, gridWidth - visibleCellsWidth)
    const maxStartY = Math.max(0, gridHeight - visibleCellsHeight)

    const startX = Math.min(
      Math.max(0, (-pan.x) / (baseCellSize * zoom)),
      maxStartX,
    )
    const startY = Math.min(
      Math.max(0, (-pan.y) / (baseCellSize * zoom)),
      maxStartY,
    )

    ctx.strokeStyle = "#00d9ff"
    ctx.lineWidth = 2
    ctx.strokeRect(
      Math.max(0, startX * cellWidth),
      Math.max(0, startY * cellHeight),
      Math.max(4, visibleCellsWidth * cellWidth),
      Math.max(4, visibleCellsHeight * cellHeight),
    )
  }, [baseCellSize, gameState, pan.x, pan.y, viewportHeight, viewportWidth, zoom])

  return (
    <div className="absolute bottom-4 right-4 border border-gray-700/80 rounded-lg overflow-hidden bg-black/60 backdrop-blur">
      <canvas ref={canvasRef} className="h-[180px] w-[220px]" />
    </div>
  )
}

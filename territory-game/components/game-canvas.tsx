"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { initializeGame, processTick, canAttackCell } from "@/lib/game-logic"
import { generateBotOrders } from "@/lib/bot-ai"
import type { GameState, AttackOrder } from "@/lib/types"
import { getTerrainColor } from "@/lib/map-generator"
import { GameHUD } from "./game-hud"
import { ControlPanel } from "./control-panel"
import { VictoryScreen } from "./victory-screen"
import { Minimap } from "./minimap"

interface GameCanvasProps {
  config: {
    numBots: number
    difficulty: number
    mapType: "continent" | "archipelago"
  }
  onRestart: () => void
}

export function GameCanvas({ config, onRestart }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGame(config.numBots, config.difficulty, config.mapType),
  )
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null)
  const [targetCell, setTargetCell] = useState<{ x: number; y: number } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [pendingOrders, setPendingOrders] = useState<AttackOrder[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const player = gameState.players[0]
  const cellSize = 8 * zoom

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase === "ended") return prev

        const botOrders = generateBotOrders(prev)
        const allOrders = [...pendingOrders, ...botOrders]
        setPendingOrders([])

        return processTick(prev, allOrders)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [pendingOrders])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 1200
    canvas.height = 800

    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(pan.x, pan.y)

    // Draw grid
    for (let y = 0; y < gameState.height; y++) {
      for (let x = 0; x < gameState.width; x++) {
        const cell = gameState.grid[y][x]

        let color: string
        if (cell.owner >= 0) {
          color = gameState.players[cell.owner].color
        } else {
          color = getTerrainColor(cell.terrain)
        }

        ctx.fillStyle = color
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)

        // Highlight selected cell
        if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
          ctx.strokeStyle = "#00d9ff"
          ctx.lineWidth = 2
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }

        // Highlight target cell
        if (targetCell && targetCell.x === x && targetCell.y === y) {
          ctx.strokeStyle = "#ff3366"
          ctx.lineWidth = 2
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }

        // Highlight hovered cell
        if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y) {
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 1
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }

    ctx.restore()
  }, [gameState, selectedCell, targetCell, hoveredCell, cellSize, pan, zoom])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = ((e.clientX - rect.left) / rect.width) * canvas.width
      const canvasY = ((e.clientY - rect.top) / rect.height) * canvas.height

      const gridX = Math.floor((canvasX - pan.x) / cellSize)
      const gridY = Math.floor((canvasY - pan.y) / cellSize)

      if (gridX < 0 || gridX >= gameState.width || gridY < 0 || gridY >= gameState.height) return

      const cell = gameState.grid[gridY][gridX]

      // If clicking own territory, select it
      if (cell.owner === 0) {
        setSelectedCell({ x: gridX, y: gridY })
        setTargetCell(null)
      }
      // If have selected cell, try to attack
      else if (selectedCell) {
        if (canAttackCell(gameState, selectedCell.x, selectedCell.y, gridX, gridY)) {
          setTargetCell({ x: gridX, y: gridY })
        }
      }
    },
    [gameState, selectedCell, cellSize, pan],
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = ((e.clientX - rect.left) / rect.width) * canvas.width
      const canvasY = ((e.clientY - rect.top) / rect.height) * canvas.height

      const gridX = Math.floor((canvasX - pan.x) / cellSize)
      const gridY = Math.floor((canvasY - pan.y) / cellSize)

      if (gridX >= 0 && gridX < gameState.width && gridY >= 0 && gridY < gameState.height) {
        setHoveredCell({ x: gridX, y: gridY })
      } else {
        setHoveredCell(null)
      }
    },
    [gameState.width, gameState.height, cellSize, pan],
  )

  const handleSendAttack = useCallback(
    (percent: number) => {
      if (!selectedCell || !targetCell) return

      const amount = player.balance * percent
      if (amount < 1) return

      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === 0 ? { ...p, balance: p.balance - amount } : p)),
      }))

      setPendingOrders((prev) => [
        ...prev,
        {
          fromX: selectedCell.x,
          fromY: selectedCell.y,
          toX: targetCell.x,
          toY: targetCell.y,
          amount,
          attackerId: 0,
        },
      ])

      setTargetCell(null)
    },
    [selectedCell, targetCell, player.balance],
  )

  if (gameState.phase === "ended") {
    return <VictoryScreen gameState={gameState} onRestart={onRestart} />
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      <GameHUD gameState={gameState} player={player} />

      <div className="flex-1 flex items-center justify-center p-4 relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="border border-gray-800 rounded-lg cursor-pointer"
          style={{ width: "100%", height: "100%", maxWidth: "1200px", maxHeight: "800px" }}
        />
        <Minimap gameState={gameState} />
      </div>

      <ControlPanel
        isBorderSelected={targetCell !== null}
        onSend={handleSendAttack}
        playerBalance={player.balance}
        gamePhase={gameState.phase}
      />
    </div>
  )
}

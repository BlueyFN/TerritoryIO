"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { initializeGame, processTick, canAttackCell } from "@/lib/game-logic"
import { generateBotOrders } from "@/lib/bot-ai"
import type { GameState, AttackOrder, StructureType, UnitType, Cell } from "@/lib/types"
import { getTerrainColor } from "@/lib/map-generator"
import { GameHUD } from "./game-hud"
import { ControlPanel } from "./control-panel"
import { VictoryScreen } from "./victory-screen"
import { Minimap } from "./minimap"
import { STRUCTURE_DEFINITIONS, UNIT_DEFINITIONS } from "@/lib/economy"
import { Button } from "@/components/ui/button"

const BASE_CELL_SIZE = 12
const MIN_ZOOM = 0.45
const MAX_ZOOM = 2.75

interface GameCanvasProps {
  config: {
    numBots: number
    difficulty: number
    mapType: "continent" | "archipelago"
    mapWidth: number
    mapHeight: number
  }
  onRestart: () => void
}

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

export function GameCanvas({ config, onRestart }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGame(config.numBots, config.difficulty, config.mapType, config.mapWidth, config.mapHeight),
  )
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null)
  const [targetCell, setTargetCell] = useState<{ x: number; y: number } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [pendingOrders, setPendingOrders] = useState<AttackOrder[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const panOrigin = useRef({ x: 0, y: 0 })
  const pointerOrigin = useRef({ x: 0, y: 0 })
  const panMoved = useRef(false)

  const player = gameState.players[0]
  const viewportWidth = gameState.width * BASE_CELL_SIZE
  const viewportHeight = gameState.height * BASE_CELL_SIZE

  const clampPan = useCallback(
    (nextPan: { x: number; y: number }, nextZoom: number = zoom) => {
      const canvasWidth = viewportWidth
      const canvasHeight = viewportHeight
      const mapWidth = viewportWidth * nextZoom
      const mapHeight = viewportHeight * nextZoom

      let x = nextPan.x
      let y = nextPan.y

      if (mapWidth <= canvasWidth) {
        x = (canvasWidth - mapWidth) / 2
      } else {
        const minX = canvasWidth - mapWidth
        const maxX = 0
        x = Math.min(Math.max(nextPan.x, minX), maxX)
      }

      if (mapHeight <= canvasHeight) {
        y = (canvasHeight - mapHeight) / 2
      } else {
        const minY = canvasHeight - mapHeight
        const maxY = 0
        y = Math.min(Math.max(nextPan.y, minY), maxY)
      }

      return { x, y }
    },
    [viewportWidth, viewportHeight, zoom],
  )

  useEffect(() => {
    setPan((prev) => clampPan(prev))
  }, [clampPan])

  const setZoomAndPan = useCallback(
    (nextZoom: number, focus?: { x: number; y: number }) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const clampedZoom = clampZoom(nextZoom)
      const focalPoint = focus ?? { x: canvas.width / 2, y: canvas.height / 2 }

      const worldX = (focalPoint.x - pan.x) / (BASE_CELL_SIZE * zoom)
      const worldY = (focalPoint.y - pan.y) / (BASE_CELL_SIZE * zoom)
      const nextPan = {
        x: focalPoint.x - worldX * BASE_CELL_SIZE * clampedZoom,
        y: focalPoint.y - worldY * BASE_CELL_SIZE * clampedZoom,
      }

      setZoom(clampedZoom)
      setPan(clampPan(nextPan, clampedZoom))
    },
    [pan.x, pan.y, zoom, clampPan],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault()
        setIsSpacePressed(true)
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const focus = { x: canvas.width / 2, y: canvas.height / 2 }
        const nextZoom = clampZoom(zoom * 1.1)
        setZoomAndPan(nextZoom, focus)
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const focus = { x: canvas.width / 2, y: canvas.height / 2 }
        const nextZoom = clampZoom(zoom * 0.9)
        setZoomAndPan(nextZoom, focus)
      }

      if (event.key === "0") {
        event.preventDefault()
        setZoomAndPan(1)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setZoomAndPan, zoom])

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase === "ended") return prev

        const botOrders = generateBotOrders(prev)
        const allOrders = [...pendingOrders, ...botOrders]

        if (pendingOrders.length > 0) {
          setPendingOrders([])
        }

        if (botOrders.length === 0) {
          return processTick(prev, allOrders)
        }

        const spendByBot = botOrders.reduce<Record<number, number>>((acc, order) => {
          acc[order.attackerId] = (acc[order.attackerId] ?? 0) + order.amount
          return acc
        }, {})

        const stateWithBotSpend: GameState = {
          ...prev,
          players: prev.players.map((p) => {
            const spend = spendByBot[p.id]
            return spend ? { ...p, balance: p.balance - spend } : p
          }),
        }

        return processTick(stateWithBotSpend, allOrders)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [pendingOrders])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = viewportWidth
    canvas.height = viewportHeight

    ctx.fillStyle = "#050505"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scaledCellSize = BASE_CELL_SIZE * zoom

    for (let y = 0; y < gameState.height; y++) {
      for (let x = 0; x < gameState.width; x++) {
        const cell = gameState.grid[y][x]

        const screenX = x * scaledCellSize + pan.x
        const screenY = y * scaledCellSize + pan.y

        if (screenX + scaledCellSize < 0 || screenY + scaledCellSize < 0) continue
        if (screenX > canvas.width || screenY > canvas.height) continue

        let color: string
        if (cell.owner >= 0) {
          color = gameState.players[cell.owner].color
        } else {
          color = getTerrainColor(cell.terrain)
        }

        ctx.fillStyle = color
        ctx.fillRect(screenX, screenY, scaledCellSize + 1, scaledCellSize + 1)

        if (cell.structure) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)"
          ctx.fillRect(
            screenX + scaledCellSize * 0.25,
            screenY + scaledCellSize * 0.25,
            scaledCellSize * 0.5,
            scaledCellSize * 0.5,
          )
        }

        if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
          ctx.strokeStyle = "#00d9ff"
          ctx.lineWidth = Math.max(1.2, 2 * zoom)
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, scaledCellSize - 1, scaledCellSize - 1)
        }

        if (targetCell && targetCell.x === x && targetCell.y === y) {
          ctx.strokeStyle = "#ff3366"
          ctx.lineWidth = Math.max(1.2, 2 * zoom)
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, scaledCellSize - 1, scaledCellSize - 1)
        }

        if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y) {
          ctx.strokeStyle = "rgba(255,255,255,0.8)"
          ctx.lineWidth = Math.max(1, 1.5 * zoom)
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, scaledCellSize - 1, scaledCellSize - 1)
        }
      }
    }
  }, [gameState, hoveredCell, pan.x, pan.y, selectedCell, targetCell, viewportHeight, viewportWidth, zoom])

  const getCanvasCoordinates = useCallback((event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }, [])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panMoved.current) {
        panMoved.current = false
        return
      }

      const coords = getCanvasCoordinates(e)
      if (!coords) return

      const scaledCellSize = BASE_CELL_SIZE * zoom
      const gridX = Math.floor((coords.x - pan.x) / scaledCellSize)
      const gridY = Math.floor((coords.y - pan.y) / scaledCellSize)

      if (gridX < 0 || gridX >= gameState.width || gridY < 0 || gridY >= gameState.height) return

      const cell = gameState.grid[gridY][gridX]

      if (cell.owner === 0) {
        setSelectedCell({ x: gridX, y: gridY })
        setTargetCell(null)
      } else if (selectedCell) {
        if (canAttackCell(gameState, selectedCell.x, selectedCell.y, gridX, gridY)) {
          setTargetCell({ x: gridX, y: gridY })
        }
      }
    },
    [gameState, getCanvasCoordinates, pan.x, pan.y, selectedCell, zoom],
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoordinates(e)
      if (!coords) return

      const scaledCellSize = BASE_CELL_SIZE * zoom
      const gridX = Math.floor((coords.x - pan.x) / scaledCellSize)
      const gridY = Math.floor((coords.y - pan.y) / scaledCellSize)

      if (gridX >= 0 && gridX < gameState.width && gridY >= 0 && gridY < gameState.height) {
        setHoveredCell({ x: gridX, y: gridY })
      } else {
        setHoveredCell(null)
      }
    },
    [gameState.height, gameState.width, getCanvasCoordinates, pan.x, pan.y, zoom],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      if (e.button === 0 && !isSpacePressed) {
        panMoved.current = false
        return
      }

      panMoved.current = false
      setIsPanning(true)
      setHoveredCell(null)
      pointerOrigin.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = pan
      canvas.setPointerCapture(e.pointerId)
    },
    [isSpacePressed, pan],
  )

  const endPan = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(false)
    if (e) {
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPanning) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const deltaX = (e.clientX - pointerOrigin.current.x) * scaleX
      const deltaY = (e.clientY - pointerOrigin.current.y) * scaleY

      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        panMoved.current = true
      }

      const nextPan = {
        x: panOrigin.current.x + deltaX,
        y: panOrigin.current.y + deltaY,
      }

      setPan(clampPan(nextPan))
    },
    [clampPan, isPanning],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const coords = getCanvasCoordinates(e)
      if (!coords) return

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const nextZoom = clampZoom(zoom * zoomFactor)
      setZoomAndPan(nextZoom, coords)
    },
    [getCanvasCoordinates, setZoomAndPan, zoom],
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
    [player.balance, selectedCell, targetCell],
  )

  const handleBuildStructure = useCallback(
    (structure: StructureType) => {
      if (!selectedCell) return
      setGameState((prev) => {
        const cell = prev.grid[selectedCell.y]?.[selectedCell.x]
        if (!cell || cell.owner !== 0) return prev
        const def = STRUCTURE_DEFINITIONS[structure]
        const playerState = prev.players[0]
        if (playerState.balance < def.cost) return prev
        const nextState = structuredClone(prev)
        const nextCell = nextState.grid[selectedCell.y][selectedCell.x]
        if (nextCell.owner !== 0) return prev
        const nextPlayer = nextState.players[0]
        nextPlayer.balance -= def.cost
        nextCell.structure = structure
        return nextState
      })
    },
    [selectedCell],
  )

  const handleTrainUnit = useCallback((unit: UnitType) => {
    setGameState((prev) => {
      const playerState = prev.players[0]
      const def = UNIT_DEFINITIONS[unit]
      if (playerState.balance < def.cost) return prev
      const nextState = structuredClone(prev)
      const nextPlayer = nextState.players[0]
      nextPlayer.balance -= def.cost
      nextPlayer.units[unit] += 1
      return nextState
    })
  }, [])

  const handleToggleAlliance = useCallback(
    (botId: number) => {
      setGameState((prev) => {
        const bot = prev.players[botId]
        if (!bot || !bot.isAlive) return prev
        const nextState = structuredClone(prev)
        const nextPlayer = nextState.players[0]
        const nextBot = nextState.players[botId]
        const allied = nextPlayer.alliances.includes(botId)
        if (allied) {
          nextPlayer.alliances = nextPlayer.alliances.filter((id) => id !== botId)
          nextBot.alliances = nextBot.alliances.filter((id) => id !== 0)
        } else {
          const acceptanceChance = nextBot.balance < nextPlayer.balance ? 0.7 : 0.45
          if (Math.random() < acceptanceChance) {
            nextPlayer.alliances = [...nextPlayer.alliances, botId]
            nextBot.alliances = [...new Set([...nextBot.alliances, 0])]
          }
        }
        return nextState
      })
    },
    [],
  )

  const selectedCellData: Cell | null = selectedCell ? gameState.grid[selectedCell.y]?.[selectedCell.x] ?? null : null
  const aliveBots = gameState.players.filter((p) => p.id !== 0 && p.isAlive)

  const zoomPercent = Math.round(zoom * 100)

  if (gameState.phase === "ended") {
    return <VictoryScreen gameState={gameState} onRestart={onRestart} />
  }

  return (
    <div className="flex h-screen flex-col bg-[#050505] text-gray-100">
      <GameHUD gameState={gameState} player={player} />
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPan}
            onPointerLeave={endPan}
            onMouseMove={handleCanvasMouseMove}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="h-full w-full cursor-crosshair select-none"
          />

          <div className="pointer-events-none absolute left-4 top-4 space-y-2 text-xs text-gray-300">
            <div className="rounded-md bg-black/60 px-3 py-2 backdrop-blur">
              <div className="font-semibold text-white">Camera Controls</div>
              <div>Scroll to zoom, hold space + drag to pan.</div>
              <div>Right-click or middle drag also pans.</div>
            </div>
          </div>

          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            <div className="rounded-md bg-black/60 px-3 py-2 text-xs text-gray-300 backdrop-blur">
              <div className="text-sm font-semibold text-white">Zoom {zoomPercent}%</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setZoomAndPan(clampZoom(zoom * 1.1))}>
                +
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setZoomAndPan(clampZoom(zoom * 0.9))}>
                –
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setZoomAndPan(1)}>
                Reset
              </Button>
            </div>
          </div>

          <Minimap
            gameState={gameState}
            pan={pan}
            zoom={zoom}
            baseCellSize={BASE_CELL_SIZE}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
          />
        </div>
        <aside className="w-full max-w-[380px] overflow-y-auto border-l border-gray-800 bg-[#0f0f0f]/90 backdrop-blur">
          <ControlPanel
            selectedCell={selectedCellData}
            targetCell={targetCell}
            onSend={handleSendAttack}
            onBuildStructure={handleBuildStructure}
            onTrainUnit={handleTrainUnit}
            onToggleAlliance={handleToggleAlliance}
            player={player}
            bots={aliveBots}
            gamePhase={gameState.phase}
          />
        </aside>
      </div>
    </div>
  )
}

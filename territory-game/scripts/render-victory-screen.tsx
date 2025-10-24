import React from "react"
import { renderToString } from "react-dom/server"

import { VictoryScreen } from "../components/victory-screen"
import type { GameState } from "../lib/types"

;(globalThis as typeof globalThis & { React?: typeof React }).React = React

const mockGameState: GameState = {
  grid: [
    [
      { x: 0, y: 0, terrain: "plains", owner: 0, balance: 10 },
      { x: 1, y: 0, terrain: "desert", owner: 1, balance: 5 },
    ],
    [
      { x: 0, y: 1, terrain: "water", owner: -1, balance: 0 },
      { x: 1, y: 1, terrain: "plains", owner: 0, balance: 7 },
    ],
  ],
  width: 2,
  height: 2,
  players: [
    {
      id: 0,
      balance: 150,
      income: 25,
      interestRate: 0.05,
      cellCount: 2,
      color: "#00d9ff",
      name: "Player",
      isBot: false,
      isAlive: true,
    },
    {
      id: 1,
      balance: 100,
      income: 20,
      interestRate: 0.05,
      cellCount: 1,
      color: "#ff0000",
      name: "Bot",
      isBot: true,
      isAlive: false,
    },
  ],
  tick: 360,
  phase: "ended",
  winner: 0,
  selectedCell: null,
  difficulty: 1,
  mapType: "continent",
}

const markup = renderToString(
  <VictoryScreen gameState={mockGameState} onRestart={() => {}} />,
)

console.log("Rendered VictoryScreen markup length:", markup.length)

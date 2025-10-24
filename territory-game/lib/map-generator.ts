import type { Cell } from "./types"

function noise2D(x: number, y: number, seed: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255

  const hash = (X * 374761393 + Y * 668265263 + seed) & 0x7fffffff
  return (hash / 0x7fffffff) * 2 - 1
}

function perlinNoise(x: number, y: number, seed: number, scale: number): number {
  x = x / scale
  y = y / scale

  const x0 = Math.floor(x)
  const x1 = x0 + 1
  const y0 = Math.floor(y)
  const y1 = y0 + 1

  const sx = x - x0
  const sy = y - y0

  const n0 = noise2D(x0, y0, seed)
  const n1 = noise2D(x1, y0, seed)
  const n2 = noise2D(x0, y1, seed)
  const n3 = noise2D(x1, y1, seed)

  const ix0 = n0 * (1 - sx) + n1 * sx
  const ix1 = n2 * (1 - sx) + n3 * sx

  return ix0 * (1 - sy) + ix1 * sy
}

function octaveNoise(x: number, y: number, seed: number, octaves: number): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += perlinNoise(x, y, seed + i, 50 / frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return value / maxValue
}

export function generatePixelMap(
  type: "continent" | "archipelago",
  seed: number = Math.random() * 10000,
  width = 120,
  height = 80,
): Cell[][] {
  const grid: Cell[][] = []

  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      const elevation = octaveNoise(x, y, seed, 6)
      const moisture = octaveNoise(x, y, seed + 1000, 4)

      let terrain: "plains" | "desert" | "mountain" | "water"

      if (type === "continent") {
        // Create a large landmass
        const distFromCenter = Math.sqrt(Math.pow((x - width / 2) / width, 2) + Math.pow((y - height / 2) / height, 2))
        const continentMask = 1 - Math.min(distFromCenter * 2, 1)
        const adjustedElevation = elevation * 0.7 + continentMask * 0.3

        if (adjustedElevation < -0.1) terrain = "water"
        else if (adjustedElevation < 0.2) terrain = "plains"
        else if (adjustedElevation < 0.5) {
          terrain = moisture > 0 ? "plains" : "desert"
        } else terrain = "mountain"
      } else {
        // Archipelago - more water, scattered islands
        if (elevation < 0.1) terrain = "water"
        else if (elevation < 0.4) terrain = "plains"
        else if (elevation < 0.7) {
          terrain = moisture > 0.2 ? "plains" : "desert"
        } else terrain = "mountain"
      }

      grid[y][x] = {
        x,
        y,
        terrain,
        owner: terrain === "water" ? -2 : -1, // -2 for water (unclaimable)
        balance: 0,
        structure: null,
      }
    }
  }

  return grid
}

export function getPlayerColors(numPlayers: number): string[] {
  return [
    "#00d9ff", // player - cyan
    "#ff3366",
    "#ff8833",
    "#ffcc33",
    "#33ff88",
    "#8833ff",
    "#ff33cc",
    "#33ccff",
    "#66ff33",
  ].slice(0, numPlayers)
}

export function getTerrainColor(terrain: "plains" | "desert" | "mountain" | "water"): string {
  switch (terrain) {
    case "plains":
      return "#4a7c4e"
    case "desert":
      return "#c9a961"
    case "mountain":
      return "#8a8a8a"
    case "water":
      return "#1a3a52"
  }
}

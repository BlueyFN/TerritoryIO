import type { GameState, Player } from "@/lib/types"

interface GameHUDProps {
  gameState: GameState
  player: Player
}

export function GameHUD({ gameState, player }: GameHUDProps) {
  const minutes = Math.floor(gameState.tick / 60)
  const seconds = gameState.tick % 60

  const totalLandCells = gameState.grid.flat().filter((cell) => cell.terrain !== "water").length
  const controlPercent = ((player.cellCount / totalLandCells) * 100).toFixed(1)

  const alivePlayers = gameState.players.filter((p) => p.isAlive).length

  const maxInterest = player.cellCount * 2
  const interestAmount = Math.min(player.balance * player.interestRate, maxInterest)

  const totalStructures = Object.values(player.structures).reduce((sum, value) => sum + value, 0)

  const unitSummary = Object.entries(player.units)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${name}: ${count}`)
    .join(" · ")

  return (
    <div className="bg-[#0f0f0f] border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Balance & Income */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Balance</div>
            <div className="text-2xl font-bold text-[#00d9ff]">${Math.floor(player.balance)}</div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Income/tick</div>
            <div className="text-lg font-semibold text-green-400">+${player.income.toFixed(0)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Interest</div>
            <div className="text-lg font-semibold text-yellow-400">+${interestAmount.toFixed(1)}</div>
          </div>
        </div>

        {/* Center: Phase & Timer */}
        <div className="text-center">
          {gameState.phase === "free-land" && (
            <div className="text-sm font-semibold text-orange-400 uppercase tracking-wide animate-pulse">
              Free Land Phase: {10 - gameState.tick}s
            </div>
          )}
          {gameState.phase === "active" && (
            <div className="text-sm text-gray-400">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Right: Territory Control */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Territories</div>
            <div className="text-lg font-semibold text-white">
              {player.cellCount} / {totalLandCells}
            </div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Control</div>
            <div className="text-lg font-semibold text-[#00d9ff]">{controlPercent}%</div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Opponents</div>
            <div className="text-lg font-semibold text-red-400">{alivePlayers - 1}</div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Military</div>
            <div className="text-lg font-semibold text-purple-300">{Math.round(player.militaryStrength)}</div>
            <div className="text-[10px] text-gray-500 truncate max-w-xs">{unitSummary || "No forces"}</div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Structures</div>
            <div className="text-lg font-semibold text-amber-300">{totalStructures}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

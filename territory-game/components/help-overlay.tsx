"use client"

import { Button } from "@/components/ui/button"

interface HelpOverlayProps {
  onClose: () => void
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg max-w-2xl w-full p-8 space-y-6">
        <h2 className="text-3xl font-bold text-[#00d9ff]">How to Play</h2>

        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Camera & Interface</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Scroll or use +/- to zoom, hold <kbd className="px-1 text-xs bg-gray-800 rounded">Space</kbd> and drag to pan.</li>
              <li>The minimap (bottom-right) shows your current viewport — use it to keep awareness of the front.</li>
              <li>The right-hand panel tracks tile info, military production, and diplomatic options.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Objective</h3>
            <p>Eliminate all opponents or control 95% of the map to win.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Free Land Phase (10s)</h3>
            <p>Grab neutral territories quickly! You can only expand into neutral land during this phase.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Resources</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Earn income from owned territories every tick (1 second)</li>
              <li>Gain interest on unspent balance (capped by territory count)</li>
              <li>Use the Infrastructure panel to construct cities, barracks, air defense, naval yards, and missile silos.</li>
              <li>Balance is spent instantly when you build, train units, or send attacks.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Combat</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click your territory, then click a neighbor to attack</li>
              <li>Choose how much balance to send (10%, 25%, 50%, or 60% max)</li>
              <li>Defenders use 10% of their balance automatically</li>
              <li>Leftover attack strength occupies the territory</li>
              <li>Train air, naval, armored, and missile forces to boost attack & defense multipliers.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Strategy Tips</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Bank balance for interest, but don't hoard too long</li>
              <li>Strike neighbors after they over-commit to attacks</li>
              <li>Build multiple fronts — bots expand aggressively on all sides.</li>
              <li>Form or break alliances in the diplomacy tab to isolate strong opponents.</li>
              <li>Watch for bot truces (temporary non-aggression)</li>
            </ul>
          </div>
        </div>

        <Button onClick={onClose} className="w-full h-12 bg-[#00d9ff] text-black hover:bg-[#00b8dd]">
          Got it!
        </Button>
      </div>
    </div>
  )
}

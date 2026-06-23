import React, { useState } from 'react';
import { Play, Settings, ShieldAlert, Sparkles, Volume2, HelpCircle } from 'lucide-react';

export default function Menu({ onStartGame, savedConfig }) {
  const [mode, setMode] = useState(savedConfig.mode || 'p1_vs_cpu');
  const [difficulty, setDifficulty] = useState(savedConfig.difficulty || 'medium');
  const [weaponSpawnEnabled, setWeaponSpawnEnabled] = useState(savedConfig.weaponSpawnEnabled !== false);
  const [p1Color, setP1Color] = useState(savedConfig.p1Color || '#00f0ff');
  const [p2Color, setP2Color] = useState(savedConfig.p2Color || '#ec4899');
  
  const [showControls, setShowControls] = useState(false);

  const colors = [
    { name: 'Neon Cyan', hex: '#00f0ff' },
    { name: 'Neon Pink', hex: '#ec4899' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber Gold', hex: '#f59e0b' },
    { name: 'Violet Glow', hex: '#8b5cf6' },
    { name: 'Crimson', hex: '#ef4444' },
    { name: 'Lime Electric', hex: '#84cc16' }
  ];

  const handleStart = () => {
    onStartGame({
      mode,
      difficulty,
      weaponSpawnEnabled,
      p1Color,
      p2Color,
      p1Name: 'Dragon P1',
      p2Name: mode === 'p1_vs_cpu' ? 'Tiger CPU' : 'Snake P2'
    });
  };

  return (
    <div className="menu-container flex items-center justify-center select-none">
      <div className="menu-card glassmorphic border border-zinc-800 shadow-2xl rounded-2xl p-8 max-w-lg w-full text-white mx-4 animate-scale-up">
        
        {/* Title Banner */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black italic tracking-tighter bg-clip-text text-gradient bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-500 uppercase drop-shadow-glow">
            Stickman Kung-Fu Duel
          </h1>
          <p className="text-xs text-zinc-400 font-medium tracking-widest uppercase mt-1">
            2D Physics Fighting Arena
          </p>
        </div>

        {!showControls ? (
          <div className="flex flex-col gap-5">
            {/* Mode Selection */}
            <div className="flex flex-col">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
                Battle Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('p1_vs_cpu')}
                  className={`py-3 px-4 rounded-lg font-black uppercase text-sm tracking-wider border transition-all ${
                    mode === 'p1_vs_cpu'
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-glow'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  P1 VS CPU
                </button>
                <button
                  type="button"
                  onClick={() => setMode('p1_vs_p2')}
                  className={`py-3 px-4 rounded-lg font-black uppercase text-sm tracking-wider border transition-all ${
                    mode === 'p1_vs_p2'
                      ? 'bg-pink-500/25 border-pink-400 text-pink-200 shadow-glow-pink'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  P1 VS P2
                </button>
              </div>
            </div>

            {/* AI Difficulty (shows if CPU selected) */}
            {mode === 'p1_vs_cpu' && (
              <div className="flex flex-col animate-fade-in">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
                  CPU Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['easy', 'medium', 'hard'].map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 px-3 rounded-md font-bold uppercase text-xs tracking-wider border transition-all ${
                        difficulty === diff
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weapon Spawn toggle */}
            <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-900 rounded-lg p-3">
              <div className="flex flex-col">
                <span className="text-sm font-extrabold uppercase tracking-wide">Weapon Spawns</span>
                <span className="text-[10px] text-zinc-500">Sword & Bo Staff will drop from the sky</span>
              </div>
              <button
                type="button"
                onClick={() => setWeaponSpawnEnabled(!weaponSpawnEnabled)}
                className={`w-14 h-7 rounded-full p-1 transition-all ${
                  weaponSpawnEnabled ? 'bg-cyan-500 shadow-glow' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transition-all ${
                    weaponSpawnEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Color Customizer */}
            <div className="grid grid-cols-2 gap-4 bg-zinc-950/30 border border-zinc-900/50 rounded-xl p-3.5">
              {/* Player 1 Color */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Player 1 Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {colors.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setP1Color(col.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        p1Color === col.hex ? 'border-white scale-110 shadow-glow' : 'border-transparent scale-90 hover:scale-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Player 2 Color */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Player 2 Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {colors.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setP2Color(col.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        p2Color === col.hex ? 'border-white scale-110 shadow-glow-pink' : 'border-transparent scale-90 hover:scale-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowControls(true)}
                className="flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-xs tracking-wider rounded-lg py-3 px-4 border border-zinc-800 hover:border-zinc-700 w-1/3 transition-all"
              >
                <HelpCircle className="w-4 h-4 mr-1.5 text-zinc-400" />
                Controls
              </button>
              
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center justify-center flex-grow bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-black uppercase text-sm tracking-wider rounded-lg py-3 shadow-glow transition-all active:scale-95"
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                FIGHT!
              </button>
            </div>
          </div>
        ) : (
          /* Controls Screen */
          <div className="flex flex-col animate-fade-in">
            <h3 className="text-lg font-extrabold uppercase tracking-wider text-center text-amber-300 mb-4 border-b border-zinc-850 pb-2">
              Arena Fighting Controls
            </h3>
            
            <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-4 text-xs">
              {/* Player 1 Controls */}
              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3">
                <h4 className="font-extrabold uppercase text-cyan-400 mb-2 tracking-wider">Player 1 (Left Side)</h4>
                <div className="flex flex-col gap-2 text-zinc-300 text-[11px]">
                  <div className="flex gap-2"><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">W</kbd> / <kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">A</kbd> / <kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">D</kbd> <span className="flex-1">Jump / Run Left / Run Right</span></div>
                  <div className="flex gap-2"><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">S</kbd> <span className="flex-1">Crouch / Block</span></div>
                  
                  <div className="border-t border-cyan-500/10 pt-2 mt-1">
                    <div className="text-cyan-300 font-bold mb-1">PUNCH VARIANTS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">J</kbd> = Basic Punch</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">D + J</kbd> = One-Inch Punch (quick &amp; close)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">A + J</kbd> = Hammer Fist (power)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">S + J</kbd> = Iron Palm (grounded)</div>
                    </div>
                  </div>

                  <div className="border-t border-cyan-500/10 pt-2">
                    <div className="text-cyan-300 font-bold mb-1">KICK VARIANTS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">K</kbd> = Front Kick</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">D + K</kbd> = Roundhouse Kick (power)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">A + K</kbd> = Side Kick (wide reach)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">S + K</kbd> = Sweep Kick (low)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Air + K</kbd> = Spinning Hook / Axe Kick</div>
                    </div>
                  </div>

                  <div className="border-t border-cyan-500/10 pt-2">
                    <div className="text-cyan-300 font-bold mb-1">SPECIAL ATTACKS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">L</kbd> = Sweep Attack</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">I</kbd> = Chi Blast (full chi) OR Finisher (after 2+ combo hits)</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">U</kbd> = Pick Up / Throw Weapon</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Player 2 Controls */}
              <div className="bg-pink-950/20 border border-pink-500/20 rounded-lg p-3">
                <h4 className="font-extrabold uppercase text-pink-400 mb-2 tracking-wider">Player 2 (Right Side)</h4>
                <div className="flex flex-col gap-2 text-zinc-300 text-[11px]">
                  <div className="flex gap-2"><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">↑/↓/←/→</kbd> <span className="flex-1">Jump / Crouch / Move</span></div>
                  
                  <div className="border-t border-pink-500/10 pt-2 mt-1">
                    <div className="text-pink-300 font-bold mb-1">PUNCH VARIANTS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Num 1</kbd> = Basic Punch</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">→ + Num 1</kbd> = One-Inch Punch</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">← + Num 1</kbd> = Hammer Fist</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">↓ + Num 1</kbd> = Iron Palm</div>
                    </div>
                  </div>

                  <div className="border-t border-pink-500/10 pt-2">
                    <div className="text-pink-300 font-bold mb-1">KICK VARIANTS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Num 2</kbd> = Front Kick</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">→ + Num 2</kbd> = Roundhouse Kick</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">← + Num 2</kbd> = Side Kick</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">↓ + Num 2</kbd> = Sweep Kick</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Air + Num 2</kbd> = Spinning Hook / Axe Kick</div>
                    </div>
                  </div>

                  <div className="border-t border-pink-500/10 pt-2">
                    <div className="text-pink-300 font-bold mb-1">SPECIAL ATTACKS:</div>
                    <div className="ml-2 space-y-0.5">
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Num 3</kbd> = Sweep Attack</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Num 5</kbd> = Chi Blast / Finisher</div>
                      <div><kbd className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-750 font-mono text-[10px]">Num 4</kbd> = Pick Up / Throw Weapon</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile controls explainer */}
              <div className="bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-zinc-400 text-[10px]">
                <span className="font-bold text-zinc-300 block mb-1">Mobile Users</span>
                Touch joysticks & action buttons will render automatically when playing on touch screens. Simply slide the left virtual joystick to run/crouch/block and tap buttons to strike!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowControls(false)}
              className="mt-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-extrabold uppercase text-xs py-2.5 rounded-lg transition-all"
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';

export default function HUD({ uiState }) {
  const {
    p1Health = 100,
    p2Health = 100,
    p1Chi = 0,
    p2Chi = 0,
    p1Combo = 0,
    p2Combo = 0,
    p1Weapon = null,
    p2Weapon = null,
    timer = 99,
    round = 1,
    p1Wins = 0,
    p2Wins = 0,
    fightText = '',
    mode = 'p1_vs_cpu',
    inputLog = []
  } = uiState || {};

  // Local state to simulate damage lag (red delay bar)
  const [p1HealthLag, setP1HealthLag] = useState(100);
  const [p2HealthLag, setP2HealthLag] = useState(100);

  // Catch up lag bars slowly
  useEffect(() => {
    const p1Timer = setTimeout(() => {
      if (p1HealthLag > p1Health) {
        setP1HealthLag(prev => Math.max(prev - 0.75, p1Health));
      } else if (p1HealthLag < p1Health) {
        setP1HealthLag(p1Health);
      }
    }, 400); // Wait 400ms before starting to catch up

    return () => clearTimeout(p1Timer);
  }, [p1Health, p1HealthLag]);

  useEffect(() => {
    const p2Timer = setTimeout(() => {
      if (p2HealthLag > p2Health) {
        setP2HealthLag(prev => Math.max(prev - 0.75, p2Health));
      } else if (p2HealthLag < p2Health) {
        setP2HealthLag(p2Health);
      }
    }, 400);

    return () => clearTimeout(p2Timer);
  }, [p2Health, p2HealthLag]);

  return (
    <div className="hud-container select-none pointer-events-none">
      {/* Top HUD Row */}
      <div className="hud-top-row">
        
        {/* PLAYER 1 HUD (Left) */}
        <div className="player-hud p1-hud flex flex-col items-start w-5/12">
          <div className="flex flex-col gap-1 mb-1">
            <div className="flex items-center gap-2">
              <span className="player-name text-cyan-400 font-extrabold uppercase text-lg tracking-wider drop-shadow-glow">
                {uiState.p1Name || "Player 1"}
              </span>
              {p1Weapon && (
                <span className="weapon-badge bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  {p1Weapon}
                </span>
              )}
            </div>
            {uiState.p1WeaponHint && (
              <span className="text-[10px] uppercase tracking-wider text-cyan-200 opacity-90">
                {uiState.p1WeaponHint}
              </span>
            )}
          </div>
          
          {/* Health Bar */}
          <div className="bar-wrapper w-full h-6 bg-zinc-900 border border-cyan-500/30 rounded overflow-hidden relative shadow-inner">
            {/* Red Damage Lag Bar */}
            <div 
              className="health-lag-bar absolute left-0 top-0 h-full bg-red-600 transition-all duration-75"
              style={{ width: `${p1HealthLag}%` }}
            />
            {/* Main Health Bar */}
            <div 
              className="health-bar absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-glow transition-all duration-100"
              style={{ width: `${p1Health}%` }}
            />
            {/* Health Value text */}
            <div className="absolute inset-0 flex items-center justify-start pl-3 text-[10px] font-black text-white/90 drop-shadow">
              {Math.ceil(p1Health)}%
            </div>
          </div>

          {/* Chi / Special Bar */}
          <div className="flex items-center gap-2 w-full mt-1.5">
            <div className="bar-wrapper chi-bar-wrapper flex-grow h-3 bg-zinc-900 border border-zinc-700/50 rounded overflow-hidden relative">
              <div 
                className={`chi-bar h-full bg-gradient-to-r from-amber-600 to-yellow-400 shadow-glow transition-all duration-150 ${p1Chi >= 100 ? 'animate-pulse' : ''}`}
                style={{ width: `${p1Chi}%` }}
              />
              {p1Chi >= 100 && (
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-950 uppercase tracking-widest animate-pulse">
                  SPECIAL READY
                </div>
              )}
            </div>
          </div>

          {/* Round Wins dots */}
          <div className="flex gap-2.5 mt-2 pl-1">
            <div className={`w-3.5 h-3.5 rounded-full border border-cyan-500/35 transition-all ${p1Wins >= 1 ? 'bg-cyan-400 shadow-glow border-cyan-300 scale-110' : 'bg-zinc-800'}`} />
            <div className={`w-3.5 h-3.5 rounded-full border border-cyan-500/35 transition-all ${p1Wins >= 2 ? 'bg-cyan-400 shadow-glow border-cyan-300 scale-110' : 'bg-zinc-800'}`} />
          </div>
        </div>

        {/* TIMER & ROUND DISPLAY (Middle) */}
        <div className="timer-hud flex flex-col items-center justify-center w-2/12">
          <span className="round-count text-zinc-400 font-black uppercase text-xs tracking-widest">
            ROUND {round}
          </span>
          <div className="timer-circle flex items-center justify-center bg-zinc-950/85 border-2 border-zinc-700/80 rounded-full w-14 h-14 mt-1 shadow-glow-amber">
            <span className={`timer-text font-black text-2xl tracking-tighter ${timer <= 15 ? 'text-red-500 animate-ping-slow' : 'text-amber-400'}`}>
              {timer}
            </span>
          </div>
        </div>

        {/* PLAYER 2 HUD (Right) */}
        <div className="player-hud p2-hud flex flex-col items-end w-5/12">
          <div className="flex flex-col gap-1 mb-1 items-end">
            <div className="flex items-center gap-2">
              {p2Weapon && (
                <span className="weapon-badge bg-pink-950/80 border border-pink-500/50 text-pink-400 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  {p2Weapon}
                </span>
              )}
              <span className="player-name text-pink-400 font-extrabold uppercase text-lg tracking-wider drop-shadow-glow-pink">
                {uiState.p2Name || "Player 2"}
              </span>
            </div>
            {uiState.p2WeaponHint && (
              <span className="text-[10px] uppercase tracking-wider text-pink-200 opacity-90">
                {uiState.p2WeaponHint}
              </span>
            )}
          </div>
          
          {/* Health Bar */}
          <div className="bar-wrapper w-full h-6 bg-zinc-900 border border-pink-500/30 rounded overflow-hidden relative shadow-inner">
            {/* Red Damage Lag Bar (right-aligned) */}
            <div 
              className="health-lag-bar absolute right-0 top-0 h-full bg-red-600 transition-all duration-75"
              style={{ width: `${p2HealthLag}%` }}
            />
            {/* Main Health Bar */}
            <div 
              className="health-bar absolute right-0 top-0 h-full bg-gradient-to-l from-pink-600 to-pink-400 shadow-glow-pink transition-all duration-100"
              style={{ width: `${p2Health}%` }}
            />
            {/* Health Value text */}
            <div className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-black text-white/90 drop-shadow">
              {Math.ceil(p2Health)}%
            </div>
          </div>

          {/* Chi Bar */}
          <div className="flex items-center gap-2 w-full mt-1.5 justify-end">
            <div className="bar-wrapper chi-bar-wrapper flex-grow h-3 bg-zinc-900 border border-zinc-700/50 rounded overflow-hidden relative">
              <div 
                className={`chi-bar h-full bg-gradient-to-l from-amber-600 to-yellow-400 shadow-glow transition-all duration-150 absolute right-0 ${p2Chi >= 100 ? 'animate-pulse' : ''}`}
                style={{ width: `${p2Chi}%` }}
              />
              {p2Chi >= 100 && (
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-950 uppercase tracking-widest animate-pulse">
                  SPECIAL READY
                </div>
              )}
            </div>
          </div>

          {/* Round Wins dots */}
          <div className="flex gap-2.5 mt-2 pr-1">
            <div className={`w-3.5 h-3.5 rounded-full border border-pink-500/35 transition-all ${p2Wins >= 1 ? 'bg-pink-400 shadow-glow-pink border-pink-300 scale-110' : 'bg-zinc-800'}`} />
            <div className={`w-3.5 h-3.5 rounded-full border border-pink-500/35 transition-all ${p2Wins >= 2 ? 'bg-pink-400 shadow-glow-pink border-pink-300 scale-110' : 'bg-zinc-800'}`} />
          </div>
        </div>

      </div>

      {/* COMBOS DISPLAY */}
      {/* Player 1 Combo */}
      {p1Combo > 1 && (
        <div className="p1-combo-alert absolute left-8 top-32 flex flex-col items-start scale-in animate-bounce">
          <span className="combo-count font-black text-5xl text-cyan-400 italic tracking-tighter drop-shadow-glow">
            {p1Combo} HITS
          </span>
          <span className="combo-lbl font-extrabold text-sm text-cyan-200 tracking-widest uppercase">
            KUNG FU COMBO!
          </span>
        </div>
      )}

      {/* Player 2 Combo */}
      {p2Combo > 1 && (
        <div className="p2-combo-alert absolute right-8 top-32 flex flex-col items-end scale-in animate-bounce">
          <span className="combo-count font-black text-5xl text-pink-400 italic tracking-tighter drop-shadow-glow-pink">
            {p2Combo} HITS
          </span>
          <span className="combo-lbl font-extrabold text-sm text-pink-200 tracking-widest uppercase">
            KUNG FU COMBO!
          </span>
        </div>
      )}
      {/* Practice Input Log on Left Side */}
      {mode === 'practice' && inputLog && inputLog.length > 0 && (
        <div className="absolute left-6 top-32 flex flex-col gap-1.5 bg-black/55 border border-zinc-800/80 p-2 rounded-lg w-20 backdrop-blur-sm pointer-events-none select-none z-30">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 text-center border-b border-zinc-800/80 pb-0.5 mb-1">INPUTS</p>
          <div className="flex flex-col gap-1 items-center">
            {inputLog.map((input) => (
              <span
                key={input.id}
                className="inline-flex items-center justify-center font-mono font-bold text-[10px] bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 rounded px-2 py-0.5 min-w-[28px] text-center uppercase animate-fade-in"
              >
                {input.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

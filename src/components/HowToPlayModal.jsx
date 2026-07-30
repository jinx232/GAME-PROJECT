import { useState, useEffect } from 'react';
import { X, Sword, Shield, Flame, Smartphone, Gamepad2, Sparkles, Target, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import './HowToPlayModal.css';

export default function HowToPlayModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('p1'); // 'p1', 'p2', 'weapons', 'tips'
  const [pressedKeys, setPressedKeys] = useState(new Set());

  // Listen to live keypresses for interactive key tester
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      setPressedKeys(prev => new Set(prev).add(key));
    };

    const handleKeyUp = (e) => {
      const key = e.key.toUpperCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isKeyPressed = (key) => pressedKeys.has(key.toUpperCase());

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="modal-frame rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white">
        
        {/* TOP BAR HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-pink-500 p-0.5 shadow-glow">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Sword className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black italic uppercase tracking-wider bg-gradient-to-r from-white via-zinc-200 to-cyan-400 bg-clip-text text-transparent">
                  COMMAND GUIDE & CONTROLS
                </h2>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-cyan-500/30">
                  v2.5D
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Master authentic weapon fighting forms, combos & combat mechanics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 p-2 rounded-xl transition-all active:scale-95"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/60 px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('p1')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-extrabold text-xs uppercase tracking-wider transition-all border-t border-x ${activeTab === 'p1' ? 'bg-zinc-900 border-cyan-500/50 text-cyan-400 shadow-glow-cyan' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Gamepad2 className="w-4 h-4" /> P1 Keyboard Controls
          </button>
          <button
            onClick={() => setActiveTab('p2')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-extrabold text-xs uppercase tracking-wider transition-all border-t border-x ${activeTab === 'p2' ? 'bg-zinc-900 border-pink-500/50 text-pink-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Gamepad2 className="w-4 h-4" /> P2 Numpad Controls
          </button>
        </div>

        {/* MODAL CONTENT CONTAINER */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          
          {/* TAB 1: PLAYER 1 CONTROLS */}
          {activeTab === 'p1' && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Interactive Key Tester Indicator */}
              <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-blue-950/40 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                    Live Key Tester: Press keys on your keyboard to test response!
                  </span>
                </div>
                {pressedKeys.size > 0 && (
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-md">
                    ACTIVE: {[...pressedKeys].join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Pickup / Throw Weapon (FEATURED AMBER CARD) */}
                <div className="control-card border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-yellow-950/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-400 text-xs uppercase tracking-wider">Pickup / Throw Weapon</span>
                      <span className="bg-amber-500/20 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded">KEY ITEM</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">Pick up floor weapons or throw in a 3D spin</p>
                  </div>
                  <span className={`keycap-3d keycap-amber ${isKeyPressed('U') ? 'active-key' : ''}`}>U</span>
                </div>

                {/* Weapon Attack / Combo (FEATURED CYAN CARD) */}
                <div className="control-card border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-blue-950/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-cyan-400 text-xs uppercase tracking-wider">Weapon Combo / Attack</span>
                      <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded">MAIN ATTACK</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">Executes authentic multi-strike martial arts forms</p>
                  </div>
                  <span className={`keycap-3d keycap-primary ${isKeyPressed('J') ? 'active-key' : ''}`}>J</span>
                </div>

                {/* Kick */}
                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Kick Strike</span>
                    <span className="text-[11px] text-zinc-400">High kick & directional roundhouse</span>
                  </div>
                  <span className={`keycap-3d ${isKeyPressed('K') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>K</span>
                </div>

                {/* Sweep */}
                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Low Sweep</span>
                    <span className="text-[11px] text-zinc-400">Low slide sweep targeting legs</span>
                  </div>
                  <span className={`keycap-3d ${isKeyPressed('L') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>L</span>
                </div>

                {/* Special Chi */}
                <div className="control-card flex items-center justify-between border-yellow-500/30">
                  <div>
                    <span className="font-black text-yellow-300 text-xs uppercase tracking-wider block">Chi Special / Flurry</span>
                    <span className="text-[11px] text-zinc-400">Ranged Chi Blast or Karate Flurry</span>
                  </div>
                  <span className={`keycap-3d keycap-amber ${isKeyPressed('I') ? 'active-key' : ''}`}>I</span>
                </div>

                {/* Block / Crouch */}
                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Block / Parry Guard</span>
                    <span className="text-[11px] text-zinc-400">Hold to block; tap at hit frame to parry</span>
                  </div>
                  <span className={`keycap-3d ${isKeyPressed('S') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>S</span>
                </div>

                {/* Movement WASD */}
                <div className="control-card sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Movement & Jump</span>
                    <span className="text-[11px] text-zinc-400">Walk across arena or jump over attacks</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`keycap-3d ${isKeyPressed('W') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>W</span>
                    <span className={`keycap-3d ${isKeyPressed('A') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>A</span>
                    <span className={`keycap-3d ${isKeyPressed('S') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>S</span>
                    <span className={`keycap-3d ${isKeyPressed('D') ? 'active-key text-cyan-400 border-cyan-500' : ''}`}>D</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PLAYER 2 CONTROLS */}
          {activeTab === 'p2' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-black uppercase text-pink-400 tracking-widest">Player 2 Shared Keyboard Controls</span>
                <span className="text-[10px] text-zinc-500 font-mono">Numpad & Arrow Keys</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="control-card border-pink-500/40 flex items-center justify-between">
                  <div>
                    <span className="font-black text-pink-400 text-xs uppercase tracking-wider block">Pickup / Throw Weapon</span>
                    <span className="text-[11px] text-zinc-400">Grab or throw weapon</span>
                  </div>
                  <span className="keycap-3d keycap-pink text-xs">Num 4</span>
                </div>

                <div className="control-card border-pink-500/40 flex items-center justify-between">
                  <div>
                    <span className="font-black text-pink-400 text-xs uppercase tracking-wider block">Weapon / Punch Attack</span>
                    <span className="text-[11px] text-zinc-400">Perform martial arts combo</span>
                  </div>
                  <span className="keycap-3d keycap-pink text-xs">Num 1</span>
                </div>

                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Kick Strike</span>
                    <span className="text-[11px] text-zinc-400">High kick</span>
                  </div>
                  <span className="keycap-3d text-xs">Num 2</span>
                </div>

                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Sweep Attack</span>
                    <span className="text-[11px] text-zinc-400">Low sweep</span>
                  </div>
                  <span className="keycap-3d text-xs">Num 3</span>
                </div>

                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Special Chi</span>
                    <span className="text-[11px] text-zinc-400">Chi blast or flurry</span>
                  </div>
                  <span className="keycap-3d text-xs">Num 5</span>
                </div>

                <div className="control-card flex items-center justify-between">
                  <div>
                    <span className="font-black text-zinc-200 text-xs uppercase tracking-wider block">Move & Jump</span>
                    <span className="text-[11px] text-zinc-400">Arrow keys</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="keycap-3d text-xs min-w-6 h-7">↑</span>
                    <span className="keycap-3d text-xs min-w-6 h-7">←</span>
                    <span className="keycap-3d text-xs min-w-6 h-7">↓</span>
                    <span className="keycap-3d text-xs min-w-6 h-7">→</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTION BAR */}
          <div className="pt-2 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to duel in the Dojo!</span>
            </div>

            <button
              onClick={onClose}
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black uppercase text-xs px-7 py-3 rounded-xl shadow-glow-amber hover:brightness-110 active:scale-95 transition-all tracking-wider"
            >
              LET'S FIGHT!
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { Swords, Zap } from 'lucide-react';

export default function MobileControls({ inputHandler, p1Chi = 0 }) {
  
  // Prevent zoom/scroll on touch gestures
  const handleTouchStart = (action, e) => {
    e.preventDefault();
    if (inputHandler) {
      inputHandler.setMobileInput(1, action, true);
    }
  };

  const handleTouchEnd = (action, e) => {
    e.preventDefault();
    if (inputHandler) {
      inputHandler.setMobileInput(1, action, false);
    }
  };

  return (
    <div className="mobile-controls-overlay select-none absolute inset-0 w-full h-full pointer-events-none flex justify-between items-end p-6 md:p-10">
      
      {/* LEFT SIDE: MOVEMENT D-PAD */}
      <div className="movement-pad pointer-events-auto relative w-36 h-36 flex items-center justify-center opacity-75 active:opacity-90 transition-opacity">
        {/* Background circle */}
        <div className="absolute inset-0 bg-zinc-950/40 border border-zinc-800 rounded-full backdrop-blur-sm pointer-events-none" />
        
        {/* D-Pad Buttons */}
        {/* JUMP (W) */}
        <button
          onTouchStart={(e) => handleTouchStart('jump', e)}
          onTouchEnd={(e) => handleTouchEnd('jump', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'jump', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'jump', false); }}
          className="absolute top-1 w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center font-black text-lg text-zinc-300 active:bg-cyan-500/30 active:border-cyan-400 active:text-cyan-200 transition-colors"
          style={{ touchAction: 'none' }}
        >
          ▲
        </button>

        {/* LEFT (A) */}
        <button
          onTouchStart={(e) => handleTouchStart('left', e)}
          onTouchEnd={(e) => handleTouchEnd('left', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'left', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'left', false); }}
          className="absolute left-1 w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center font-black text-lg text-zinc-300 active:bg-cyan-500/30 active:border-cyan-400 active:text-cyan-200 transition-colors"
          style={{ touchAction: 'none' }}
        >
          ◀
        </button>

        {/* RIGHT (D) */}
        <button
          onTouchStart={(e) => handleTouchStart('right', e)}
          onTouchEnd={(e) => handleTouchEnd('right', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'right', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'right', false); }}
          className="absolute right-1 w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center font-black text-lg text-zinc-300 active:bg-cyan-500/30 active:border-cyan-400 active:text-cyan-200 transition-colors"
          style={{ touchAction: 'none' }}
        >
          ▶
        </button>

        {/* CROUCH / BLOCK (S) */}
        <button
          onTouchStart={(e) => handleTouchStart('crouch', e)}
          onTouchEnd={(e) => handleTouchEnd('crouch', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) { inputHandler.setMobileInput(1, 'crouch', true); inputHandler.setMobileInput(1, 'block', true); } }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) { inputHandler.setMobileInput(1, 'crouch', false); inputHandler.setMobileInput(1, 'block', false); } }}
          className="absolute bottom-1 w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center font-black text-lg text-zinc-300 active:bg-cyan-500/30 active:border-cyan-400 active:text-cyan-200 transition-colors"
          style={{ touchAction: 'none' }}
        >
          ▼
        </button>

        {/* Center core */}
        <div className="w-5 h-5 bg-zinc-950 rounded-full border border-zinc-800 z-10 pointer-events-none" />
      </div>

      {/* RIGHT SIDE: ACTION BUTTONS */}
      <div className="action-pad pointer-events-auto relative w-48 h-48 flex items-center justify-center opacity-80 active:opacity-90">
        
        {/* PUNCH BUTTON (J) */}
        <button
          onTouchStart={(e) => handleTouchStart('punch', e)}
          onTouchEnd={(e) => handleTouchEnd('punch', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'punch', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'punch', false); }}
          className="absolute bottom-1 right-1 w-16 h-16 bg-cyan-600 border border-cyan-400 rounded-full flex items-center justify-center font-extrabold text-sm text-white shadow-lg active:bg-cyan-500 active:scale-95 transition-all"
          style={{ touchAction: 'none' }}
        >
          PUNCH
        </button>

        {/* KICK BUTTON (K) */}
        <button
          onTouchStart={(e) => handleTouchStart('kick', e)}
          onTouchEnd={(e) => handleTouchEnd('kick', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'kick', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'kick', false); }}
          className="absolute bottom-16 right-16 w-16 h-16 bg-pink-600 border border-pink-400 rounded-full flex items-center justify-center font-extrabold text-sm text-white shadow-lg active:bg-pink-500 active:scale-95 transition-all"
          style={{ touchAction: 'none' }}
        >
          KICK
        </button>

        {/* SWEEP BUTTON (L) */}
        <button
          onTouchStart={(e) => handleTouchStart('sweep', e)}
          onTouchEnd={(e) => handleTouchEnd('sweep', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'sweep', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'sweep', false); }}
          className="absolute bottom-1 right-20 w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center font-extrabold text-[10px] text-zinc-300 active:bg-zinc-800 active:scale-95 transition-all"
          style={{ touchAction: 'none' }}
        >
          SWEEP
        </button>

        {/* WEAPON INTERACT / PICKUP BUTTON (U) */}
        <button
          onTouchStart={(e) => handleTouchStart('pickup', e)}
          onTouchEnd={(e) => handleTouchEnd('pickup', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'pickup', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'pickup', false); }}
          className="absolute top-4 right-1 w-12 h-12 bg-amber-600 border border-amber-400 rounded-full flex items-center justify-center font-black text-white shadow-md active:bg-amber-500 active:scale-95 transition-all"
          style={{ touchAction: 'none' }}
        >
          <Swords className="w-5 h-5" />
        </button>

        {/* CHI SPECIAL BUTTON (I) */}
        {p1Chi >= 100 && (
          <button
            onTouchStart={(e) => handleTouchStart('special', e)}
            onTouchEnd={(e) => handleTouchEnd('special', e)}
            onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'special', true); }}
            onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'special', false); }}
            className="absolute top-0 right-16 w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-500 border-2 border-white rounded-full flex items-center justify-center font-extrabold text-xs text-black shadow-glow animate-pulse active:scale-95 transition-all z-20"
            style={{ touchAction: 'none' }}
          >
            <Zap className="w-6 h-6 fill-current animate-bounce" />
          </button>
        )}
      </div>

    </div>
  );
}

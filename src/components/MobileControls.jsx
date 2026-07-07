import React from 'react';
import { Swords, Zap } from 'lucide-react';
import './MobileControls.css';

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
    <div className="mobile-controls-overlay select-none">
      
      {/* LEFT SIDE: MOVEMENT D-PAD */}
      <div className="movement-pad">
        {/* Background circle */}
        <div className="dpad-bg" />
        
        {/* D-Pad Buttons */}
        {/* JUMP (W) */}
        <button
          onTouchStart={(e) => handleTouchStart('jump', e)}
          onTouchEnd={(e) => handleTouchEnd('jump', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'jump', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'jump', false); }}
          className="dpad-btn dpad-btn-up"
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
          className="dpad-btn dpad-btn-left"
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
          className="dpad-btn dpad-btn-right"
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
          className="dpad-btn dpad-btn-down"
          style={{ touchAction: 'none' }}
        >
          ▼
        </button>

        {/* Center core */}
        <div className="dpad-center" />
      </div>

      {/* RIGHT SIDE: ACTION BUTTONS */}
      <div className="action-pad">
        
        {/* PUNCH BUTTON (J) */}
        <button
          onTouchStart={(e) => handleTouchStart('punch', e)}
          onTouchEnd={(e) => handleTouchEnd('punch', e)}
          onMouseDown={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'punch', true); }}
          onMouseUp={(e) => { e.preventDefault(); if (inputHandler) inputHandler.setMobileInput(1, 'punch', false); }}
          className="action-btn action-btn-punch"
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
          className="action-btn action-btn-kick"
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
          className="action-btn action-btn-sweep"
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
          className="action-btn action-btn-weapon"
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
            className="action-btn action-btn-chi"
            style={{ touchAction: 'none' }}
          >
            <Zap className="w-6 h-6 fill-current animate-bounce" />
          </button>
        )}
      </div>

    </div>
  );
}

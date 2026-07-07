import React from 'react';
import './OrientationPrompt.css';

export default function OrientationPrompt() {
  return (
    <div className="orientation-prompt-overlay select-none">
      <div className="orientation-prompt-box glassmorphic animate-scale-up">
        {/* Animated Rotating Device Icon */}
        <div className="device-animation-container">
          <svg className="device-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Circular background arrows representing rotation */}
            <path
              d="M 50 15 A 35 35 0 0 1 85 50"
              stroke="url(#neon-grad-cyan)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M 50 85 A 35 35 0 0 1 15 50"
              stroke="url(#neon-grad-pink)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M 85 50 L 90 43 M 85 50 L 78 48"
              stroke="#00f0ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 15 50 L 10 57 M 15 50 L 22 52"
              stroke="#ec4899"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="neon-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00ffff" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="neon-grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* The phone itself, animated rotating */}
            <g className="phone-icon-group">
              <rect
                x="32"
                y="18"
                width="36"
                height="64"
                rx="6"
                fill="#09090b"
                stroke="#3f3f46"
                strokeWidth="3.5"
              />
              {/* Screen area */}
              <rect
                x="35"
                y="24"
                width="30"
                height="50"
                rx="2"
                fill="#18181b"
              />
              {/* Home button / Indicator */}
              <circle cx="50" cy="77" r="2" fill="#52525b" />
              {/* Speaker */}
              <line x1="46" y1="21" x2="54" y2="21" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <h2 className="orientation-title">
          Rotate Device
        </h2>
        
        <p className="orientation-desc">
          Please rotate your screen to <strong>Landscape Mode</strong> for the best combat experience.
        </p>

        <div className="orientation-badge">
          ⚔️ STICKMAN ARENA LOCK
        </div>
      </div>
    </div>
  );
}

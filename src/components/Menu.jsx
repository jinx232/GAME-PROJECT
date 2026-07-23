import { useState, useEffect } from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';

const AnimatedBackground = () => {
  const [animationState, setAnimationState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationState(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const drawStickman = (x, y, punch, color) => {
    const headSize = 8;
    const bodyY = y + headSize;
    const limbOffset = punch ? 6 : 4;

    return (
      <g key={`${x}-${y}`}>
        {/* Head */}
        <circle cx={x} cy={y} r={headSize} fill={color} opacity="0.8"/>
        {/* Body */}
        <line x1={x} y1={bodyY} x2={x} y2={bodyY + 10} stroke={color} strokeWidth="2" opacity="0.8"/>
        {/* Arms */}
        <line x1={x} y1={bodyY + 2} x2={x - limbOffset} y2={bodyY - 2} stroke={color} strokeWidth="2" opacity="0.8"/>
        <line x1={x} y1={bodyY + 2} x2={x + limbOffset + (punch ? 3 : 0)} y2={bodyY - 2} stroke={color} strokeWidth="2" opacity="0.8"/>
        {/* Legs */}
        <line x1={x} y1={bodyY + 10} x2={x - 4} y2={bodyY + 16} stroke={color} strokeWidth="2" opacity="0.8"/>
        <line x1={x} y1={bodyY + 10} x2={x + 4} y2={bodyY + 16} stroke={color} strokeWidth="2" opacity="0.8"/>
      </g>
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 1000 400">
        {/* Background gradient */}
        <defs>
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="50%" stopColor="#1a0a3a" />
            <stop offset="100%" stopColor="#0a0a1a" />
          </linearGradient>
        </defs>
        <rect width="1000" height="400" fill="url(#bg-gradient)"/>

        {/* Animated stars/particles */}
        {[...Array(20)].map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={100 + i * 50}
            cy={50 + Math.sin(animationState * 0.1 + i) * 30}
            r="1.5"
            fill="#00ffff"
            opacity={Math.sin(animationState * 0.05 + i) * 0.5 + 0.3}
          />
        ))}

        {/* Arena floor */}
        <rect x="0" y="280" width="1000" height="120" fill="#1a1a2e" opacity="0.6"/>
        <line x1="0" y1="280" x2="1000" y2="280" stroke="#00ffff" strokeWidth="2" opacity="0.5"/>

        {/* Left fighter - punching animation */}
        {drawStickman(
          150 + Math.sin(animationState * 0.1) * 10,
          220 + Math.abs(Math.sin(animationState * 0.08)) * 5,
          Math.abs(Math.sin(animationState * 0.08)) > 0.6,
          '#00f0ff'
        )}

        {/* Right fighter - kicking animation */}
        {drawStickman(
          850 - Math.sin(animationState * 0.1) * 10,
          220 + Math.abs(Math.cos(animationState * 0.08)) * 5,
          Math.abs(Math.cos(animationState * 0.08)) > 0.6,
          '#ec4899'
        )}

        {/* Impact effect */}
        {Math.abs(Math.sin(animationState * 0.1)) > 0.8 && (
          <>
            <circle cx="500" cy="240" r="20" fill="none" stroke="#ffff00" strokeWidth="2" opacity="0.6"/>
            <circle cx="500" cy="240" r="30" fill="none" stroke="#ffff00" strokeWidth="1" opacity="0.3"/>
          </>
        )}

        {/* VS text */}
        <text x="500" y="350" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#ffff00" opacity="0.4">
          VS
        </text>
      </svg>
    </div>
  );
};

const MapPreview = ({ map, isSelected, onClick }) => {
  const renderMapPreview = () => {
    switch(map.id) {
      case 'cyberpunk_dojo':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Background */}
            <defs>
              <linearGradient id="cyber-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a0033" />
                <stop offset="50%" stopColor="#330066" />
                <stop offset="100%" stopColor="#1a0033" />
              </linearGradient>
              <linearGradient id="cyber-glow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ffff" />
                <stop offset="100%" stopColor="#ff0099" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#cyber-bg)"/>
            
            {/* Grid lines */}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 40} x2="200" y2={i * 40} stroke="#00ffff" strokeWidth="1" opacity="0.3"/>
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="200" stroke="#00ffff" strokeWidth="1" opacity="0.3"/>
            ))}
            
            {/* Torii gate */}
            <rect x="70" y="50" width="60" height="80" fill="none" stroke="#ff0066" strokeWidth="3" opacity="0.8"/>
            <circle cx="100" cy="60" r="15" fill="none" stroke="#ffff00" strokeWidth="2" opacity="0.6"/>
            
            {/* Floor */}
            <rect x="0" y="150" width="200" height="50" fill="#1a0033" opacity="0.5"/>
            <line x1="0" y1="150" x2="200" y2="150" stroke="#00ffff" strokeWidth="2" opacity="0.5"/>
          </svg>
        );
      case 'neon_rooftop':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="rooftop-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a1428" />
                <stop offset="100%" stopColor="#1a3a5c" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#rooftop-bg)"/>
            
            {/* Buildings */}
            <rect x="10" y="80" width="30" height="120" fill="#0f1f3f" stroke="#00ffff" strokeWidth="2"/>
            <rect x="50" y="60" width="35" height="140" fill="#1a2f5f" stroke="#00ffff" strokeWidth="2"/>
            <rect x="95" y="70" width="30" height="130" fill="#0f1f3f" stroke="#00ffff" strokeWidth="2"/>
            <rect x="135" y="75" width="40" height="125" fill="#1a2f5f" stroke="#00ffff" strokeWidth="2"/>
            
            {/* Windows */}
            {[...Array(3)].map((_, i) => (
              <rect key={`w1-${i}`} x="15" y={100 + i * 25} width="8" height="8" fill="#ffff00" opacity="0.7"/>
            ))}
            {[...Array(4)].map((_, i) => (
              <rect key={`w2-${i}`} x="56" y={80 + i * 25} width="8" height="8" fill="#00ffff" opacity="0.6"/>
            ))}
            
            {/* Moon */}
            <circle cx="170" cy="40" r="20" fill="#ffff99" opacity="0.4"/>
            
            {/* Rain effect */}
            {[...Array(6)].map((_, i) => (
              <line key={`r${i}`} x1={30 + i * 30} y1="20" x2={25 + i * 30} y2="50" stroke="#38bdf8" strokeWidth="1" opacity="0.4"/>
            ))}
          </svg>
        );
      case 'zen_garden':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="zen-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#zen-bg)"/>
            
            {/* Mountains */}
            <path d="M 0 120 L 50 60 L 100 100 L 150 50 L 200 110 L 200 200 L 0 200" fill="#10b981" opacity="0.8"/>
            <path d="M 0 140 L 40 90 L 80 120 L 120 70 L 160 100 L 200 140 L 200 200 L 0 200" fill="#059669" opacity="0.6"/>
            
            {/* Zen circle */}
            <circle cx="100" cy="90" r="30" fill="none" stroke="#34d399" strokeWidth="2" opacity="0.7"/>
            <circle cx="100" cy="90" r="15" fill="#34d399" opacity="0.4"/>
            
            {/* Raked sand pattern */}
            {[...Array(8)].map((_, i) => (
              <path key={`sand${i}`} d={`M 20 ${140 + i * 7} Q 100 ${135 + i * 7} 180 ${140 + i * 7}`} stroke="#d1fae5" strokeWidth="1" fill="none" opacity="0.4"/>
            ))}
            
            {/* Stones */}
            <circle cx="60" cy="145" r="8" fill="#6ee7b7" opacity="0.6"/>
            <circle cx="140" cy="160" r="10" fill="#6ee7b7" opacity="0.5"/>
          </svg>
        );
      case 'magma_cavern':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="magma-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4c0519" />
                <stop offset="50%" stopColor="#7c1e1e" />
                <stop offset="100%" stopColor="#1f0407" />
              </linearGradient>
              <radialGradient id="lava-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </radialGradient>
            </defs>
            <rect width="200" height="200" fill="url(#magma-bg)"/>
            
            {/* Lava pools */}
            <ellipse cx="60" cy="120" rx="25" ry="20" fill="#ff6b35" opacity="0.8"/>
            <ellipse cx="140" cy="140" rx="30" ry="22" fill="#f97316" opacity="0.7"/>
            
            {/* Glow */}
            <ellipse cx="60" cy="120" rx="35" ry="30" fill="url(#lava-glow)" opacity="0.2"/>
            <ellipse cx="140" cy="140" rx="40" ry="35" fill="url(#lava-glow)" opacity="0.15"/>
            
            {/* Rocks */}
            <path d="M 20 180 L 30 150 L 50 170 L 70 160 L 85 185" fill="#7c1e1e" opacity="0.8"/>
            <path d="M 130 190 L 145 160 L 165 175 L 180 165 L 190 190" fill="#7c1e1e" opacity="0.8"/>
            
            {/* Embers rising */}
            {[...Array(4)].map((_, i) => (
              <circle key={`e${i}`} cx={50 + i * 35} cy={100 + i * 20} r="3" fill="#fbbf24" opacity="0.5"/>
            ))}
          </svg>
        );
      case 'stormy_temple':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="storm-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e3a5f" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#storm-bg)"/>
            
            {/* Dark clouds */}
            <ellipse cx="50" cy="40" rx="40" ry="25" fill="#1e1b4b" opacity="0.8"/>
            <ellipse cx="150" cy="30" rx="50" ry="30" fill="#1e1b4b" opacity="0.7"/>
            
            {/* Lightning bolts */}
            <path d="M 70 10 L 65 40 L 75 40 L 60 90" stroke="#fbbf24" strokeWidth="3" fill="none" opacity="0.8"/>
            <path d="M 130 15 L 125 35 L 135 35 L 120 75" stroke="#a3e635" strokeWidth="2" fill="none" opacity="0.6"/>
            
            {/* Temple structure */}
            <rect x="75" y="110" width="50" height="70" fill="#0f0f0f" stroke="#64748b" strokeWidth="2"/>
            <polygon points="75,110 100,70 125,110" fill="#1e293b" stroke="#64748b" strokeWidth="2"/>
            
            {/* Rain */}
            {[...Array(10)].map((_, i) => (
              <line key={`rain${i}`} x1={20 + i * 18} y1="50" x2={10 + i * 18} y2="100" stroke="#64748b" strokeWidth="1" opacity="0.5"/>
            ))}
            
            {/* Floor reflection */}
            <rect x="0" y="160" width="200" height="40" fill="#0a0e27" opacity="0.5"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-56 rounded-xl border-4 overflow-hidden transition-all group cursor-pointer transform hover:scale-110 ${
        isSelected
          ? 'border-yellow-400 shadow-2xl shadow-yellow-500/80 scale-110 ring-4 ring-yellow-400/50'
          : 'border-cyan-400 hover:border-yellow-400 hover:shadow-2xl hover:shadow-cyan-500/50'
      }`}
      style={{
        boxShadow: isSelected ? '0 0 30px rgba(255, 255, 0, 0.8), 0 0 50px rgba(0, 255, 255, 0.5)' : 'none'
      }}
    >
      {/* SVG Preview */}
      <div className="absolute inset-0">
        {renderMapPreview()}
      </div>

      {/* Overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-center justify-end p-3">
        <span className="text-lg font-black uppercase tracking-wider text-yellow-300 drop-shadow-xl">{map.name}</span>
      </div>

      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-3 right-3 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center text-black font-black shadow-lg animate-pulse">
          ★
        </div>
      )}
    </button>
  );
};

export default function Menu({ onStartGame, savedConfig }) {
  const [mode, setMode] = useState(savedConfig.mode || 'p1_vs_cpu');
  const [difficulty, setDifficulty] = useState(savedConfig.difficulty || 'medium');
  const [weaponSpawnEnabled, setWeaponSpawnEnabled] = useState(savedConfig.weaponSpawnEnabled !== false);
  const [p1Color, setP1Color] = useState(savedConfig.p1Color || '#00f0ff');
  const [p2Color, setP2Color] = useState(savedConfig.p2Color || '#ec4899');
  const [selectedMap, setSelectedMap] = useState(savedConfig.map || 'cyberpunk_dojo');
  
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

  const maps = [
    { id: 'cyberpunk_dojo', name: 'Cyberpunk Dojo' },
    { id: 'neon_rooftop', name: 'Neon Rooftop' },
    { id: 'zen_garden', name: 'Zen Garden' },
    { id: 'magma_cavern', name: 'Magma Cavern' },
    { id: 'stormy_temple', name: 'Stormy Temple' }
  ];

  const handleStart = () => {
    onStartGame({
      mode,
      difficulty,
      weaponSpawnEnabled,
      p1Color,
      p2Color,
      map: selectedMap,
      p1Name: 'Dragon P1',
      p2Name: mode === 'p1_vs_cpu' ? 'Tiger CPU' : 'Snake P2'
    });
  };

  return (
    <div className="menu-container min-h-screen w-full flex items-center justify-center select-none p-4 bg-zinc-950 overflow-hidden relative">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main content */}
      <div className="w-full max-w-6xl relative z-10">
        
        {/* Header Section - Arcade Style */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <h1 className="text-8xl font-black italic tracking-tighter text-yellow-400 uppercase drop-shadow-2xl mb-2" style={{textShadow: '0 0 20px #00ffff, 0 0 40px #ff0099, 4px 4px 0 #000'}}>
              DUELIST
            </h1>
            <div className="h-2 w-64 bg-gradient-to-r from-cyan-400 via-yellow-400 to-pink-500 mx-auto rounded-full shadow-lg" style={{boxShadow: '0 0 20px rgba(255, 255, 0, 0.8)'}}></div>
          </div>
          <p className="text-2xl font-black text-cyan-400 tracking-widest uppercase drop-shadow-lg" style={{textShadow: '0 0 10px #00ffff'}}>
            Ultimate Stick Fighting Arena
          </p>
        </div>

        {!showControls ? (
          <div className="border-4 border-yellow-400 rounded-2xl p-8 backdrop-blur-md bg-zinc-900/70 space-y-8 text-white" style={{boxShadow: '0 0 30px rgba(255, 255, 0, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.1)'}}>
            
            {/* Battle Mode */}
            <div className="flex flex-col">
              <label className="text-lg font-black uppercase tracking-widest text-yellow-300 mb-4 px-3 py-1 bg-cyan-500/20 w-fit border-2 border-cyan-400 rounded" style={{textShadow: '0 0 10px #00ffff'}}>
                ⚔️ BATTLE MODE
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('p1_vs_cpu')}
                  className={`py-4 px-6 rounded-lg font-black uppercase text-lg tracking-wider border-4 transition-all transform hover:scale-105 ${
                    mode === 'p1_vs_cpu'
                      ? 'bg-cyan-500/40 border-cyan-400 text-cyan-100 shadow-lg'
                      : 'bg-zinc-800/60 border-zinc-600 text-yellow-300 hover:border-cyan-400'
                  }`}
                  style={{boxShadow: mode === 'p1_vs_cpu' ? '0 0 15px rgba(0, 255, 255, 0.8)' : ''}}
                >
                  👤 VS CPU
                </button>
                <button
                  type="button"
                  onClick={() => setMode('p1_vs_p2')}
                  className={`py-4 px-6 rounded-lg font-black uppercase text-lg tracking-wider border-4 transition-all transform hover:scale-105 ${
                    mode === 'p1_vs_p2'
                      ? 'bg-pink-500/40 border-pink-400 text-pink-100 shadow-lg'
                      : 'bg-zinc-800/60 border-zinc-600 text-yellow-300 hover:border-pink-400'
                  }`}
                  style={{boxShadow: mode === 'p1_vs_p2' ? '0 0 15px rgba(236, 72, 153, 0.8)' : ''}}
                >
                  👥 VS PLAYER
                </button>
              </div>
            </div>

            {/* CPU Difficulty */}
            {mode === 'p1_vs_cpu' && (
              <div className="flex flex-col animate-fade-in">
                <label className="text-lg font-black uppercase tracking-widest text-yellow-300 mb-4 px-3 py-1 bg-amber-500/20 w-fit border-2 border-amber-400 rounded" style={{textShadow: '0 0 10px #ffaa00'}}>
                  🤖 CPU DIFFICULTY
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['easy', 'medium', 'hard'].map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-3 px-4 rounded-lg font-black uppercase text-lg tracking-wider border-3 transition-all transform hover:scale-105 ${
                        difficulty === diff
                          ? 'bg-amber-500/40 border-amber-400 text-amber-100 shadow-lg'
                          : 'bg-zinc-800/60 border-zinc-600 text-yellow-300'
                      }`}
                      style={{boxShadow: difficulty === diff ? '0 0 12px rgba(255, 170, 0, 0.8)' : ''}}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Arena Selection - Full Width */}
            <div className="flex flex-col">
              <label className="text-lg font-black uppercase tracking-widest text-yellow-300 mb-4 px-3 py-1 bg-purple-500/20 w-fit border-2 border-purple-400 rounded" style={{textShadow: '0 0 10px #cc00ff'}}>
                🏛️ SELECT YOUR ARENA
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {maps.map(map => (
                  <MapPreview
                    key={map.id}
                    map={map}
                    isSelected={selectedMap === map.id}
                    onClick={() => setSelectedMap(map.id)}
                  />
                ))}
              </div>
            </div>

            {/* Weapon Spawn */}
            <div className="flex items-center justify-between bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-3 border-yellow-500 rounded-lg p-5">
              <div className="flex flex-col">
                <span className="text-lg font-extrabold uppercase tracking-wide text-yellow-300" style={{textShadow: '0 0 10px #ffaa00'}}>
                  ⚡ WEAPON SPAWNS
                </span>
                <span className="text-sm text-yellow-200/80 mt-1">Sword & Bo Staff drop during battle</span>
              </div>
              <button
                type="button"
                onClick={() => setWeaponSpawnEnabled(!weaponSpawnEnabled)}
                className={`w-16 h-10 rounded-full p-1 transition-all border-3 font-black text-lg ${
                  weaponSpawnEnabled 
                    ? 'bg-cyan-500 border-cyan-300 shadow-lg shadow-cyan-500/60' 
                    : 'bg-zinc-700 border-zinc-600'
                }`}
              >
                <div
                  className={`bg-white w-7 h-7 rounded-full shadow-md transition-all ${
                    weaponSpawnEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Color Customizer */}
            <div className="bg-gradient-to-br from-zinc-800/60 to-purple-900/30 border-3 border-purple-500 rounded-lg p-5 space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-black uppercase tracking-widest text-cyan-300 mb-3" style={{textShadow: '0 0 8px #00ffff'}}>
                  🥋 Player 1 Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setP1Color(col.hex)}
                      className={`w-8 h-8 rounded-full border-3 transition-all transform hover:scale-125 ${
                        p1Color === col.hex 
                          ? 'border-white scale-125 shadow-lg' 
                          : 'border-gray-600 hover:border-white/50'
                      }`}
                      style={{ 
                        backgroundColor: col.hex,
                        boxShadow: p1Color === col.hex ? `0 0 15px ${col.hex}` : ''
                      }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-black uppercase tracking-widest text-pink-300 mb-3" style={{textShadow: '0 0 8px #ff0099'}}>
                  🥋 Player 2 Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setP2Color(col.hex)}
                      className={`w-8 h-8 rounded-full border-3 transition-all transform hover:scale-125 ${
                        p2Color === col.hex 
                          ? 'border-white scale-125 shadow-lg' 
                          : 'border-gray-600 hover:border-white/50'
                      }`}
                      style={{ 
                        backgroundColor: col.hex,
                        boxShadow: p2Color === col.hex ? `0 0 15px ${col.hex}` : ''
                      }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowControls(true)}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-yellow-300 font-black uppercase text-lg tracking-wider rounded-lg py-4 px-6 border-3 border-yellow-500 transition-all transform hover:scale-105 hover:shadow-lg"
              >
                <HelpCircle className="w-5 h-5" />
                Controls
              </button>
              
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center justify-center gap-2 flex-grow bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-black font-black uppercase text-xl tracking-wider rounded-lg py-4 border-4 border-yellow-300 transition-all transform hover:scale-105 active:scale-95 animate-pulse"
                style={{boxShadow: '0 0 30px rgba(255, 170, 0, 0.9), 0 0 50px rgba(255, 0, 0, 0.6)'}}
              >
                <Sparkles className="w-6 h-6 fill-current" />
                FIGHT!
              </button>
            </div>
          </div>
        ) : (
          /* Controls Screen */
          <div className="flex flex-col animate-fade-in glassmorphic border border-zinc-800/50 shadow-2xl rounded-2xl p-6 backdrop-blur-md bg-zinc-950/40 text-white">
            <h3 className="text-xl font-extrabold uppercase tracking-wider text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-400 mb-4">
              Battle Controls
            </h3>
            
            <div className="max-h-96 overflow-y-auto pr-2 flex flex-col gap-4 text-xs">
              {/* Player 1 Controls */}
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-3">
                <h4 className="font-extrabold uppercase text-cyan-300 mb-2 tracking-wider">Player 1 (Left)</h4>
                <div className="flex flex-col gap-1.5 text-zinc-300 text-[10px]">
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">W</kbd> / <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">A</kbd> / <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">D</kbd> = Jump / Move</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">J</kbd> = Punch | <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">K</kbd> = Kick</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">L</kbd> = Sweep | <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">I</kbd> = Chi Blast</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">U</kbd> = Pick Up/Throw Weapon</div>
                </div>
              </div>

              {/* Player 2 Controls */}
              <div className="bg-pink-950/40 border border-pink-500/30 rounded-lg p-3">
                <h4 className="font-extrabold uppercase text-pink-300 mb-2 tracking-wider">Player 2 (Right)</h4>
                <div className="flex flex-col gap-1.5 text-zinc-300 text-[10px]">
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">↑↓←→</kbd> = Move | <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">Num 1</kbd> = Punch</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">Num 2</kbd> = Kick | <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">Num 3</kbd> = Sweep</div>
                  <div><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">Num 5</kbd> = Chi Blast | <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[9px]">Num 4</kbd> = Weapon</div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-3 text-zinc-300">
                <div className="font-bold text-purple-300 mb-1">💡 Tips:</div>
                <ul className="space-y-0.5 text-[9px] ml-2">
                  <li>• Combine directions with attacks for special moves</li>
                  <li>• Build combos to unlock devastating finishers</li>
                  <li>• Chi meter charges with blocks and hits</li>
                  <li>• Touch controls auto-enable on mobile devices</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowControls(false)}
              className="mt-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-extrabold uppercase text-xs py-2.5 rounded-lg transition-all"
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

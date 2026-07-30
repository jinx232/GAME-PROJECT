import { useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, HelpCircle, Swords, Shield, Sparkles, User, Settings, MapPin } from 'lucide-react';
import HowToPlayModal from '../components/HowToPlayModal';
import MenuBackgroundCanvas from '../components/MenuBackgroundCanvas';
import './MainMenu.css';

const mapDescriptions = {
  cyberpunk_dojo:  { text: 'A neon dojo full of glowing lanterns and electric energy.',    hazard: 'none', icon: '🏯' },
  neon_rooftop:    { text: 'A high-rise rooftop shimmering with skyline and electric drones.', hazard: '🛸 Cyber Drones', icon: '🏙️' },
  zen_garden:      { text: 'A bamboo garden with calm stones, petals, and wind gusts.',    hazard: '💨 Wind Gusts', icon: '🎋' },
  magma_cavern:    { text: 'A molten cavern filled with fire, smoke, and raw heat.',        hazard: '🔥 Lava Spouts', icon: '🌋' },
  stormy_temple:   { text: 'A storm-lashed temple pulsing with thunder and rain.',          hazard: '⚡ Lightning Strikes', icon: '⚡' },
};

const MODES = [
  {
    id: 'p1_vs_cpu',
    label: 'VS CPU',
    icon: '🤖',
    desc: 'Classic 1v1 duel against the AI. First to 2 rounds wins.',
    color: '#00f0ff',
  },
  {
    id: 'p1_vs_p2',
    label: 'VS PLAYER',
    icon: '⚔️',
    desc: 'Local 2-player battle on the same keyboard.',
    color: '#ec4899',
  },
  {
    id: 'survival',
    label: 'SURVIVAL',
    icon: '🌊',
    desc: 'Fight endless CPU waves. Each win heals +30 HP. How far can you go?',
    color: '#f97316',
  },
  {
    id: 'practice',
    label: 'PRACTICE',
    icon: '🥋',
    desc: 'Train in the Dojo. Infinite health, input log, and dummy controls.',
    color: '#a78bfa',
  },
];

const CUSTOM_COLORS = [
  { hex: '#00f0ff', name: 'Cyan' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#fbbf24', name: 'Gold' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#a855f7', name: 'Purple' }
];

const MainMenu = ({ onStartGame, maps, savedConfig, isFullscreen, toggleFullscreen, isSoundOn, toggleSound }) => {
  const [gameMode, setGameMode]             = useState(savedConfig?.mode || 'p1_vs_cpu');
  const [selectedMap, setSelectedMap]       = useState(savedConfig?.map || maps[0]);
  const [weaponSpawnEnabled, setWeaponSpawn]= useState(savedConfig?.weaponSpawnEnabled !== undefined ? savedConfig.weaponSpawnEnabled : true);
  const [difficulty, setDifficulty]         = useState(savedConfig?.difficulty || 'medium');

  const [p1Name, setP1Name]                 = useState(savedConfig?.p1Name || 'Dragon P1');
  const [p2Name, setP2Name]                 = useState(savedConfig?.p2Name || 'Tiger CPU');
  const [p1Color, setP1Color]               = useState(savedConfig?.p1Color || '#00f0ff');
  const [p2Color, setP2Color]               = useState(savedConfig?.p2Color || '#ec4899');
  
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  // Play subtle web audio sound FX on menu hover/click
  const playSoundFX = (type = 'hover') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !isSoundOn) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hover') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'select') {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'start') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // AudioContext fallback
    }
  };

  const handleGameModeChange = (newMode) => {
    playSoundFX('select');
    setGameMode(newMode);
    setP2Name(prevP2Name => {
      if (newMode === 'p1_vs_p2') {
        if (prevP2Name === 'Tiger CPU' || prevP2Name === 'Dummy' || prevP2Name === 'CPU Wave') {
          return 'Snake P2';
        }
      } else if (newMode === 'practice') {
        if (prevP2Name === 'Tiger CPU' || prevP2Name === 'Snake P2' || prevP2Name === 'CPU Wave') {
          return 'Dummy';
        }
      } else if (newMode === 'p1_vs_cpu') {
        if (prevP2Name === 'Snake P2' || prevP2Name === 'Dummy' || prevP2Name === 'CPU Wave') {
          return 'Tiger CPU';
        }
      } else if (newMode === 'survival') {
        return 'CPU Wave';
      }
      return prevP2Name;
    });
  };

  const handleStart = () => {
    playSoundFX('start');
    onStartGame({
      mode: gameMode,
      map: selectedMap,
      weaponSpawnEnabled,
      difficulty,
      p1Name,
      p2Name,
      p1Color,
      p2Color
    });
  };

  const formatMapName = (id) =>
    id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const currentMode = MODES.find(m => m.id === gameMode);
  const hideDifficulty = gameMode === 'practice';

  return (
    <div className={`main-menu-container ${isFullscreen ? 'fullscreen-active' : ''}`}>
      {/* Realistic Animated Dojo Stage Background */}
      <MenuBackgroundCanvas p1Color={p1Color} p2Color={p2Color} />

      {/* Command Guide Modal */}
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />

      <div className="main-menu relative z-10 animate-fade-in">
        
        {/* TOP UTILITY HEADER */}
        <div className="menu-top-bar flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-pink-500 p-0.5 shadow-glow-cyan">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Swords className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="game-title uppercase tracking-widest bg-gradient-to-r from-white via-cyan-200 to-pink-500 bg-clip-text text-transparent drop-shadow-glow">
                  STICKMAN DUELIST
                </h1>
                <span className="bg-gradient-to-r from-cyan-500 to-pink-500 text-zinc-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-md">
                  NEXUS v2.5D
                </span>
              </div>
              <p className="game-subtitle text-xs text-zinc-400">Select game mode, battle arena, and customize your fighters</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { playSoundFX('select'); setIsHowToPlayOpen(true); }}
              onMouseEnter={() => playSoundFX('hover')}
              className="menu-top-btn text-amber-400 border-amber-500/40 hover:bg-amber-950/40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-glow-amber transition-all"
              title="Command Guide & Controls"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>COMMAND GUIDE</span>
            </button>

            <button
              onClick={() => { playSoundFX('hover'); toggleSound(); }}
              className={`menu-top-btn ${isSoundOn ? 'sound-on' : 'sound-off'}`}
              title={isSoundOn ? 'Mute Sound' : 'Unmute Sound'}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            <button
              onClick={() => { playSoundFX('hover'); toggleFullscreen(); }}
              className={`menu-top-btn ${isFullscreen ? 'fullscreen-on' : ''}`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* ELEGANT 3-COLUMN AAA MENU LAYOUT */}
        <div className="menu-3col-grid">
          
          {/* COLUMN 1: GAME MODE & START BUTTON */}
          <div className="menu-col flex flex-col justify-between">
            <div>
              <div className="col-header flex items-center gap-2 mb-3">
                <span className="col-num">01</span>
                <h2>GAME MODE</h2>
              </div>

              <div className="mode-grid-v flex flex-col gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    className={`mode-card-v ${gameMode === m.id ? 'active' : ''}`}
                    style={{ '--mode-color': m.color }}
                    onMouseEnter={() => playSoundFX('hover')}
                    onClick={() => handleGameModeChange(m.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="mode-icon-v">{m.icon}</span>
                      <span className="mode-label-v">{m.label}</span>
                    </div>
                    {gameMode === m.id && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow" />}
                  </button>
                ))}
              </div>

              {currentMode && (
                <div className="mode-desc-box mt-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                  <p className="text-xs text-zinc-300 leading-relaxed">{currentMode.desc}</p>
                </div>
              )}
            </div>

            {/* START BUTTON ANCHORED AT BOTTOM OF COL 1 */}
            <button 
              className="start-game-button shadow-glow-cyan flex items-center justify-center gap-2.5 mt-4" 
              onClick={handleStart}
              onMouseEnter={() => playSoundFX('hover')}
            >
              <Swords className="w-5 h-5 fill-current" />
              <span>
                {gameMode === 'practice' ? 'ENTER DOJO' : gameMode === 'survival' ? 'SURVIVAL' : 'ENTER BATTLE!'}
              </span>
            </button>
          </div>

          {/* COLUMN 2: ARENA SELECTION */}
          <div className="menu-col">
            <div className="col-header flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="col-num">02</span>
                <h2>BATTLE ARENA</h2>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{selectedMap.replace('_', ' ')}</span>
            </div>

            <div className="map-grid-v flex flex-col gap-2">
              {maps.map((map) => (
                <button
                  key={map}
                  className={`map-card-v ${selectedMap === map ? 'active' : ''}`}
                  onMouseEnter={() => playSoundFX('hover')}
                  onClick={() => { playSoundFX('select'); setSelectedMap(map); }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{mapDescriptions[map]?.icon || '⚔️'}</span>
                    <span className="font-bold text-xs uppercase">{formatMapName(map)}</span>
                  </div>
                  {selectedMap === map && <div className="w-2 h-2 rounded-full bg-amber-400 shadow-glow-amber" />}
                </button>
              ))}
            </div>

            {mapDescriptions[selectedMap] && (
              <div className="map-info-box mt-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <p className="map-note text-xs text-zinc-300">{mapDescriptions[selectedMap].text}</p>
                {mapDescriptions[selectedMap].hazard !== 'none' && (
                  <span className="map-hazard-badge mt-2 inline-block text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md">
                    HAZARD: {mapDescriptions[selectedMap].hazard}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* COLUMN 3: FIGHTER CUSTOMIZATION & MATCH SETTINGS */}
          <div className="menu-col flex flex-col justify-between">
            <div>
              <div className="col-header flex items-center gap-2 mb-3">
                <span className="col-num">03</span>
                <h2>FIGHTERS & RULES</h2>
              </div>

              {/* Player 1 Card */}
              <div className="custom-box mb-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">Player 1 Avatar</span>
                  <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: p1Color, boxShadow: `0 0 8px ${p1Color}` }} />
                </div>
                <input
                  type="text"
                  className="menu-input-field"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value.slice(0, 12))}
                  placeholder="Player 1 Name"
                />
                <div className="color-picker-row">
                  {CUSTOM_COLORS.map(c => (
                    <button
                      key={c.hex}
                      className={`color-picker-dot ${p1Color === c.hex ? 'active' : ''}`}
                      style={{ '--color-hex': c.hex }}
                      onClick={() => { playSoundFX('select'); setP1Color(c.hex); }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Player 2 / CPU Card */}
              <div className="custom-box mb-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-pink-400 uppercase tracking-wider">Player 2 / CPU</span>
                  <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: p2Color, boxShadow: `0 0 8px ${p2Color}` }} />
                </div>
                <input
                  type="text"
                  className="menu-input-field"
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value.slice(0, 12))}
                  placeholder="Player 2 Name"
                  disabled={gameMode === 'survival'}
                />
                <div className="color-picker-row">
                  {CUSTOM_COLORS.map(c => (
                    <button
                      key={c.hex}
                      className={`color-picker-dot ${p2Color === c.hex ? 'active' : ''}`}
                      style={{ '--color-hex': c.hex }}
                      onClick={() => { playSoundFX('select'); setP2Color(c.hex); }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Weapon Spawns & Difficulty Toggles */}
              <div className="flex gap-2">
                <div className="flex-1 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                  <span className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Weapons</span>
                  <div className="flex gap-1">
                    <button 
                      className={`mini-toggle ${weaponSpawnEnabled ? 'active' : ''}`} 
                      onClick={() => { playSoundFX('select'); setWeaponSpawn(true); }}
                    >
                      ON
                    </button>
                    <button 
                      className={`mini-toggle ${!weaponSpawnEnabled ? 'active' : ''}`} 
                      onClick={() => { playSoundFX('select'); setWeaponSpawn(false); }}
                    >
                      OFF
                    </button>
                  </div>
                </div>

                {!hideDifficulty && (
                  <div className="flex-1 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-[10px] font-black text-zinc-400 uppercase block mb-1">Difficulty</span>
                    <div className="flex gap-1">
                      {['easy', 'medium', 'hard'].map((level) => (
                        <button
                          key={level}
                          className={`mini-toggle ${difficulty === level ? 'active' : ''}`}
                          onClick={() => { playSoundFX('select'); setDifficulty(level); }}
                        >
                          {level.charAt(0).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MainMenu;
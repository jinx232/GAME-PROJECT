import { useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import './MainMenu.css';

const mapDescriptions = {
  cyberpunk_dojo:  { text: 'A neon dojo full of glowing lanterns and electric energy.',    hazard: 'none' },
  neon_rooftop:    { text: 'A high-rise rooftop shimmering with skyline and electric drones.', hazard: '🛸 Cyber Drones' },
  zen_garden:      { text: 'A bamboo garden with calm stones, petals, and wind gusts.',    hazard: '💨 Wind Gusts' },
  magma_cavern:    { text: 'A molten cavern filled with fire, smoke, and raw heat.',        hazard: '🔥 Lava Spouts' },
  stormy_temple:   { text: 'A storm-lashed temple pulsing with thunder and rain.',          hazard: '⚡ Lightning Strikes' },
};

const MODES = [
  {
    id: 'p1_vs_cpu',
    label: 'VS CPU',
    icon: '🤖',
    desc: 'Classic 1v1 against the CPU. First to 2 rounds wins.',
    color: '#00f0ff',
  },
  {
    id: 'p1_vs_p2',
    label: 'VS PLAYER',
    icon: '⚔️',
    desc: 'Local 2-player duel on the same keyboard.',
    color: '#ec4899',
  },
  {
    id: 'survival',
    label: 'SURVIVAL',
    icon: '🌊',
    desc: 'Fight endless CPU waves. Each win heals you. How far can you go?',
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

  // Adjust P2 default name dynamically on game mode changes (if not custom modified)
  const handleGameModeChange = (newMode) => {
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
      <div className="main-menu">
        {/* Top bar settings for Fullscreen and Sound */}
        <div className="menu-top-bar">
          <button
            onClick={toggleSound}
            className={`menu-top-btn ${isSoundOn ? 'sound-on' : 'sound-off'}`}
            title={isSoundOn ? 'Mute Sound' : 'Unmute Sound'}
          >
            {isSoundOn ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`menu-top-btn ${isFullscreen ? 'fullscreen-on' : ''}`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-cyan-400" /> : <Maximize2 className="w-5 h-5 text-zinc-400" />}
          </button>
        </div>
        <div className="menu-header">
          <div className="menu-badge">⚔️</div>
          <div>
            <h1 className="game-title">Stickman Duelist</h1>
            <p className="game-subtitle">Choose your mode, arena, and settings before the match begins.</p>
          </div>
        </div>

        <div className="menu-grid">
          {/* LEFT PANEL */}
          <div className="menu-panel">

            {/* Mode Selection */}
            <div className="menu-section">
              <h2>Game Mode</h2>
              <div className="mode-grid">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    className={`mode-card ${gameMode === m.id ? 'active' : ''}`}
                    style={{ '--mode-color': m.color }}
                    onClick={() => handleGameModeChange(m.id)}
                  >
                    <span className="mode-icon">{m.icon}</span>
                    <span className="mode-label">{m.label}</span>
                  </button>
                ))}
              </div>
              {currentMode && (
                <p className="mode-desc">{currentMode.desc}</p>
              )}
            </div>

            {/* Weapons & Difficulty */}
            <div className="flex gap-4">
              <div className="menu-section flex-1">
                <h2>Weapons</h2>
                <div className="button-group">
                  <button className={`menu-button ${weaponSpawnEnabled ? 'active' : ''}`} onClick={() => setWeaponSpawn(true)}>On</button>
                  <button className={`menu-button ${!weaponSpawnEnabled ? 'active' : ''}`} onClick={() => setWeaponSpawn(false)}>Off</button>
                </div>
              </div>

              {!hideDifficulty && (
                <div className="menu-section flex-1">
                  <h2>Difficulty</h2>
                  <div className="button-group">
                    {['easy', 'medium', 'hard'].map((level) => (
                      <button
                        key={level}
                        className={`menu-button ${difficulty === level ? 'active' : ''}`}
                        onClick={() => setDifficulty(level)}
                      >
                        {level.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Customize Player 1 */}
            <div className="menu-section mt-3 pt-3 border-t border-zinc-800/60">
              <h2>Customize P1</h2>
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
                    onClick={() => setP1Color(c.hex)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="menu-panel menu-panel-secondary">
            {/* Select Arena */}
            <div className="menu-section">
              <h2>Select Arena</h2>
              <div className="map-grid">
                {maps.map((map) => (
                  <button
                    key={map}
                    className={`map-button ${selectedMap === map ? 'active' : ''}`}
                    onClick={() => setSelectedMap(map)}
                  >
                    {formatMapName(map)}
                  </button>
                ))}
              </div>
              {mapDescriptions[selectedMap] && (
                <>
                  <p className="map-note">{mapDescriptions[selectedMap].text}</p>
                  {mapDescriptions[selectedMap].hazard !== 'none' && (
                    <p className="map-hazard-badge">Hazard: {mapDescriptions[selectedMap].hazard}</p>
                  )}
                </>
              )}
            </div>

            {/* Customize Player 2 */}
            <div className="menu-section mt-3 pt-3 border-t border-zinc-800/60">
              <h2>Customize P2</h2>
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
                    onClick={() => setP2Color(c.hex)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Practice info block */}
            {gameMode === 'practice' && (
              <div className="practice-info-panel">
                <p className="practice-info-title">🥋 Practice Dojo Features</p>
                <ul className="practice-info-list">
                  <li>♾️ Infinite health (both fighters)</li>
                  <li>🃏 Input log shown on screen</li>
                  <li>🤖 Dummy stands still by default</li>
                  <li>⏱️ No round timer</li>
                </ul>
              </div>
            )}

            {/* Survival info block */}
            {gameMode === 'survival' && (
              <div className="survival-info-panel">
                <p className="survival-info-title">🌊 Survival Mode</p>
                <ul className="survival-info-list">
                  <li>⬆️ CPU gets harder each wave</li>
                  <li>❤️ +30 HP restored after each win</li>
                  <li>🗺️ Random arena each wave</li>
                  <li>🏆 High score saved locally</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <button className="start-game-button" onClick={handleStart}>
          {gameMode === 'practice' ? 'ENTER DOJO' : gameMode === 'survival' ? 'START SURVIVAL' : 'FIGHT!'}
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
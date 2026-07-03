import React, { useState } from 'react';
import './MainMenu.css';

const mapDescriptions = {
  cyberpunk_dojo: 'A neon dojo full of glowing lanterns and electric energy.',
  neon_rooftop: 'A high-rise rooftop shimmering with lightning and skyline lights.',
  zen_garden: 'A quiet bamboo garden with calm stones and drifting petals.',
  magma_cavern: 'A molten cavern filled with fire, smoke, and raw heat.',
  stormy_temple: 'A storm-lashed temple pulsing with thunder and rain.',
};

const MainMenu = ({ onStartGame, maps, savedConfig }) => {
  const [gameMode, setGameMode] = useState(savedConfig?.mode || 'p1_vs_cpu');
  const [selectedMap, setSelectedMap] = useState(savedConfig?.map || maps[0]);
  const [weaponSpawnEnabled, setWeaponSpawnEnabled] = useState(
    savedConfig?.weaponSpawnEnabled !== undefined ? savedConfig.weaponSpawnEnabled : true
  );
  const [difficulty, setDifficulty] = useState(savedConfig?.difficulty || 'medium');

  const handleStart = () => {
    onStartGame({
      mode: gameMode,
      map: selectedMap,
      weaponSpawnEnabled,
      difficulty,
    });
  };

  const formatMapName = (mapId) => mapId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="main-menu-container">
      <div className="main-menu">
        <div className="menu-header">
          <div className="menu-badge">⚔️</div>
          <div>
            <h1 className="game-title">Stickman Duelist</h1>
            <p className="game-subtitle">Choose your arena and set the fight rules before the match begins.</p>
          </div>
        </div>

        <div className="menu-grid">
          <div className="menu-panel">
            <div className="menu-section">
              <h2>Game Mode</h2>
              <div className="button-group">
                <button
                  className={`menu-button ${gameMode === 'p1_vs_cpu' ? 'active' : ''}`}
                  onClick={() => setGameMode('p1_vs_cpu')}
                >
                  Player vs CPU
                </button>
                <button
                  className={`menu-button ${gameMode === 'p1_vs_p2' ? 'active' : ''}`}
                  onClick={() => setGameMode('p1_vs_p2')}
                >
                  Player vs Player
                </button>
              </div>
            </div>

            <div className="menu-section">
              <h2>Weapons</h2>
              <div className="button-group">
                <button
                  className={`menu-button ${weaponSpawnEnabled ? 'active' : ''}`}
                  onClick={() => setWeaponSpawnEnabled(true)}
                >
                  On
                </button>
                <button
                  className={`menu-button ${!weaponSpawnEnabled ? 'active' : ''}`}
                  onClick={() => setWeaponSpawnEnabled(false)}
                >
                  Off
                </button>
              </div>
            </div>

            <div className="menu-section">
              <h2>Difficulty</h2>
              <div className="button-group">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    className={`menu-button ${difficulty === level ? 'active' : ''}`}
                    onClick={() => setDifficulty(level)}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="menu-panel menu-panel-secondary">
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
              <p className="map-note">{mapDescriptions[selectedMap]}</p>
            </div>
          </div>
        </div>

        <button className="start-game-button" onClick={handleStart}>
          FIGHT!
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
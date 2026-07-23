import { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MainMenu from './game/MainMenu';
import MobileControls from './components/MobileControls';
import OrientationPrompt from './components/OrientationPrompt';
import { RotateCcw, Home, Play, Pause, Smartphone, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRestartTriggered, setIsRestartTriggered] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track browser fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };
  
  // Game state fed back from Canvas
  const [uiState, setUiState] = useState({
    p1Health: 100,
    p2Health: 100,
    p1Chi: 0,
    p2Chi: 0,
    p1Combo: 0,
    p2Combo: 0,
    p1Weapon: null,
    p2Weapon: null,
    p1WeaponHint: null,
    p2WeaponHint: null,
    timer: 99,
    round: 1,
    p1Wins: 0,
    p2Wins: 0,
    gameState: 'countdown',
    winner: null,
    fightText: '',
    inputLog: []
  });

  const [practiceDummyMode, setPracticeDummyMode] = useState('stand');
  const [practiceInfiniteHealth, setPracticeInfiniteHealth] = useState(true);
  const [practiceInfiniteChi, setPracticeInfiniteChi] = useState(false);

  // Game config set by Menu
  const [config, setConfig] = useState({
    mode: 'p1_vs_cpu',
    difficulty: 'medium',
    weaponSpawnEnabled: true,
    p1Color: '#00f0ff',
    p2Color: '#ec4899',
    p1Name: 'Dragon P1',
    p2Name: 'Tiger CPU'
  });

  // Mobile virtual controls toggle
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [forceTouchControls, setForceTouchControls] = useState(false);

  // Auto detect touch devices
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
      window.removeEventListener('touchstart', detectTouch);
    };
    window.addEventListener('touchstart', detectTouch);
    return () => window.removeEventListener('touchstart', detectTouch);
  }, []);

  // Keyboard shortcut for pausing (Escape or KeyP)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (inGame && (e.code === 'Escape' || e.code === 'KeyP')) {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inGame]);

  // Synchronize practice options with game engine
  useEffect(() => {
    if (inGame && window.gameEngine) {
      window.gameEngine.practiceDummyMode = practiceDummyMode;
      window.gameEngine.practiceInfiniteHealth = practiceInfiniteHealth;
      window.gameEngine.practiceInfiniteChi = practiceInfiniteChi;
    }
  }, [inGame, practiceDummyMode, practiceInfiniteHealth, practiceInfiniteChi, isRestartTriggered]);

  // Listen to game input events and store a sliding queue of the last 8 inputs in Practice Mode
  useEffect(() => {
    if (!inGame || config.mode !== 'practice' || isPaused) return;

    const keyLabels = {
      KeyW: 'W',
      KeyA: 'A',
      KeyS: 'S',
      KeyD: 'D',
      KeyJ: 'J',
      KeyK: 'K',
      KeyL: 'L',
      KeyI: 'I',
      KeyU: 'U'
    };

    const handleKeyDown = (e) => {
      const label = keyLabels[e.code];
      if (label) {
        setUiState(prev => {
          const nextLog = [...(prev.inputLog || []), { label, id: Date.now() + Math.random() }];
          if (nextLog.length > 8) nextLog.shift();
          return { ...prev, inputLog: nextLog };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inGame, config.mode, isPaused]);

  const handleStartGame = (newConfig) => {
    setConfig(newConfig);
    setInGame(true);
    setIsPaused(false);
    setIsRestartTriggered(false);
  };

  const triggerRestart = () => {
    setIsRestartTriggered(true);
    setIsPaused(false);
  };

  const handleRestartCompleted = () => {
    setIsRestartTriggered(false);
  };

  const handleExitToMenu = () => {
    setInGame(false);
    setIsPaused(false);
    setIsRestartTriggered(false);
  };

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    if (window.gameEngine?.sound) {
      window.gameEngine.sound.toggle(next);
    }
  };

  return (
    <div className={`app-container min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white overflow-hidden font-sans ${isFullscreen ? 'p-0 w-screen h-screen' : 'p-2 sm:p-4'}`}>
      
      {/* Full-screen orientation lock prompt for mobile portrait mode */}
      <OrientationPrompt />

      {!inGame ? (
        /* START MENU SCREEN */
        <MainMenu
          onStartGame={(menuConfig) => handleStartGame({
            ...config,
            ...menuConfig,
          })}
          savedConfig={config}
          maps={['cyberpunk_dojo', 'neon_rooftop', 'zen_garden', 'magma_cavern', 'stormy_temple']}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          isSoundOn={isSoundOn}
          toggleSound={toggleSound}
        />
      ) : (
        /* GAMEPLAY CONTAINER */
        <div className={`game-wrapper relative flex items-center justify-center transition-all duration-300 ${isFullscreen ? 'fullscreen-active w-screen h-screen max-w-none aspect-none rounded-none border-none' : 'w-full max-w-4xl aspect-video'}`}>
          
          {/* Main Game Render Viewport */}
          <GameCanvas
            config={config}
            onUIUpdate={setUiState}
            isPaused={isPaused}
            isRestartTriggered={isRestartTriggered}
            onRestartCompleted={handleRestartCompleted}
          />

          {/* HUD Overlay */}
          <HUD uiState={uiState} />

          {/* Desktop Pause / Utility Buttons (Top Center) */}
          <div className="utility-bar absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 pointer-events-auto bg-zinc-950/60 border border-zinc-800/80 rounded-full px-4 py-1.5 backdrop-blur-md">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-zinc-400 hover:text-white transition-colors"
              title={isPaused ? "Resume Game" : "Pause Game"}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={triggerRestart}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Restart Match"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExitToMenu}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Exit to Main Menu"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={() => setForceTouchControls(!forceTouchControls)}
              className={`text-zinc-400 hover:text-white transition-colors ${forceTouchControls || isTouchDevice ? 'text-cyan-400' : ''}`}
              title="Toggle Touch Controls"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            {/* Sound Toggle */}
            <div className="w-px h-4 bg-zinc-700" />
            <button
              onClick={toggleSound}
              className={`transition-colors ${isSoundOn ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-400'}`}
              title={isSoundOn ? 'Mute Sound' : 'Unmute Sound'}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`transition-colors ${isFullscreen ? 'text-cyan-400 hover:text-cyan-300' : 'text-zinc-400 hover:text-white'}`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Virtual mobile controls */}
          {(isTouchDevice || forceTouchControls) && !isPaused && uiState.gameState !== 'gameover' && (
            <MobileControls
              inputHandler={window.gameEngine ? window.gameEngine.input : null}
              p1Chi={uiState.p1Chi}
            />
          )}

          {/* PAUSE OVERLAY */}
          {isPaused && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center animate-fade-in">
              <div className="glassmorphic p-8 rounded-xl border border-zinc-800/80 shadow-2xl text-center max-w-sm w-full mx-4">
                <h2 className="text-3xl font-black italic uppercase tracking-wider text-amber-400 drop-shadow-glow">
                  PAUSED
                </h2>
                <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest">
                  Match is temporarily suspended
                </p>

                {/* Quick controls reminder */}
                <div className="mt-4 mb-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">P1 Controls</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-400">
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">W</kbd> Jump</span>
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">A</kbd>/<kbd className="bg-zinc-800 px-1 rounded text-zinc-300">D</kbd> Move</span>
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">J</kbd> Punch</span>
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">K</kbd> Kick</span>
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">L</kbd> Sweep</span>
                    <span><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">I</kbd> Chi Blast</span>
                    <span className="col-span-2"><kbd className="bg-zinc-800 px-1 rounded text-zinc-300">S</kbd> Block/Crouch &nbsp;·&nbsp; <kbd className="bg-zinc-800 px-1 rounded text-zinc-300">U</kbd> Weapon</span>
                  </div>
                </div>
                
                {/* Practice dummy & status toggles */}
                {config.mode === 'practice' && (
                  <div className="mt-3 bg-zinc-900/60 border border-violet-800/40 rounded-lg p-3 text-left flex flex-col gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-2">Practice Toggles</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const next = !practiceInfiniteHealth;
                            setPracticeInfiniteHealth(next);
                            if (window.gameEngine) window.gameEngine.practiceInfiniteHealth = next;
                          }}
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors border ${practiceInfiniteHealth ? 'bg-violet-900/60 text-white border-violet-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                        >
                          Inf Health: {practiceInfiniteHealth ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => {
                            const next = !practiceInfiniteChi;
                            setPracticeInfiniteChi(next);
                            if (window.gameEngine) window.gameEngine.practiceInfiniteChi = next;
                          }}
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors border ${practiceInfiniteChi ? 'bg-violet-900/60 text-white border-violet-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                        >
                          Inf Chi: {practiceInfiniteChi ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-2">Dummy Mode</p>
                      <div className="flex gap-2 flex-wrap">
                        {['stand','block','crouch','jump'].map(dm => (
                          <button
                            key={dm}
                            onClick={() => {
                              setPracticeDummyMode(dm);
                              if (window.gameEngine) window.gameEngine.practiceDummyMode = dm;
                            }}
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors border ${practiceDummyMode === dm ? 'bg-violet-900/80 text-white border-violet-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
                          >
                            {dm}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-2">
                  <button
                    onClick={() => setIsPaused(false)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold uppercase text-sm py-2.5 rounded-lg shadow-md transition-all active:scale-95"
                  >
                    Resume Duel
                  </button>
                  <button
                    onClick={triggerRestart}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold uppercase text-sm py-2.5 rounded-lg transition-all"
                  >
                    Restart Match
                  </button>
                  <button
                    onClick={toggleSound}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold uppercase text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isSoundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
                    {isSoundOn ? 'Sound: ON' : 'Sound: OFF'}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold uppercase text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
                    {isFullscreen ? 'Fullscreen: ON' : 'Fullscreen: OFF'}
                  </button>
                  <button
                    onClick={handleExitToMenu}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold uppercase text-sm py-2.5 rounded-lg transition-all"
                  >
                    Exit to Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MATCH GAME OVER OVERLAY */}
          {uiState.gameState === 'gameover' && (
            <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur z-40 flex flex-col items-center justify-center animate-fade-in">
              <div className="glassmorphic p-8 rounded-xl border border-zinc-800 shadow-2xl text-center max-w-sm w-full mx-4">
                {config.mode === 'survival' ? (
                  <>
                    <h2 className="text-3xl font-black italic uppercase tracking-wider text-orange-500">
                      SURVIVAL OVER
                    </h2>
                    <p className="text-zinc-300 text-sm font-extrabold mt-3 uppercase tracking-wider">
                      {uiState.fightText}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-black italic uppercase tracking-wider text-red-500 drop-shadow-glow-pink">
                      VICTORY!
                    </h2>
                    <p className="text-zinc-300 text-sm font-extrabold mt-3 uppercase tracking-wider">
                      {uiState.winner === 1 ? 'Player 1' : (config.mode === 'p1_vs_cpu' ? 'Tiger CPU' : 'Player 2')} Wins the Match
                    </p>
                  </>
                )}
                <div className="flex items-center justify-center gap-4 text-xs font-semibold text-zinc-400 mt-2 bg-zinc-950/40 p-2 rounded border border-zinc-900">
                  <span>P1 Wins: {uiState.p1Wins}</span>
                  <span className="text-zinc-700">|</span>
                  <span>P2 Wins: {uiState.p2Wins}</span>
                </div>
                
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    onClick={triggerRestart}
                    className="w-full bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-black uppercase text-sm py-2.5 rounded-lg shadow-glow transition-all active:scale-95"
                  >
                    Rematch
                  </button>
                  <button
                    onClick={handleExitToMenu}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold uppercase text-sm py-2.5 rounded-lg transition-all"
                  >
                    Exit to Menu
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
      
      {/* Footer copyright */}
      <footer className="mt-6 text-[10px] text-zinc-600 font-medium select-none pointer-events-none uppercase tracking-widest text-center">
        © 2026 STICKMAN KUNG-FU ARENA DUEL • ALL RIGHTS RESERVED
      </footer>
    </div>
  );
}

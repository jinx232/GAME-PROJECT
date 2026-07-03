import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

export default function GameCanvas({ config, onUIUpdate, isPaused, isRestartTriggered, onRestartCompleted }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const requestRef = useRef(null);

  // Critical fix: track isPaused via ref so the game loop reads the latest value
  // WITHOUT causing a full engine teardown/rebuild on every pause toggle
  const isPausedRef = useRef(isPaused);

  const LOGICAL_WIDTH = 960;
  const LOGICAL_HEIGHT = 540;

  // Sync pause ref and control ambient music — no engine rebuild
  useEffect(() => {
    isPausedRef.current = isPaused;
    const sound = engineRef.current?.sound;
    if (sound) {
      if (isPaused) {
        sound.stopAmbient();
      } else {
        sound.startAmbient();
      }
    }
  }, [isPaused]);

  // Build engine only when config changes (not on pause!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;

    const engine = new GameEngine(canvas, {
      mode: config.mode,
      difficulty: config.difficulty,
      p1Color: config.p1Color,
      p2Color: config.p2Color,
      p1Name: config.p1Name,
      p2Name: config.p2Name,
      weaponSpawnEnabled: config.weaponSpawnEnabled,
      onUIEvent: (state) => {
        onUIUpdate(state);
      }
    });

    // Use the new setMap method before initializing
    engine.setMap(config.map);

    engineRef.current = engine;
    window.gameEngine = engine;
    engine.init();

    // Start ambient music
    engine.sound.startAmbient();

    // Game loop
    const tick = () => {
      if (!isPausedRef.current && engine.gameState !== 'gameover') {
        engine.update();
      }
      engine.draw();
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (engineRef.current) {
        engineRef.current.sound?.stopAmbient();
        engineRef.current.cleanUp();
      }
    };
  }, [config, onUIUpdate]); // Only config — NOT isPaused

  // Handle restart triggers
  useEffect(() => {
    if (isRestartTriggered && engineRef.current) {
      engineRef.current.restartMatch();
      onRestartCompleted();
    }
  }, [isRestartTriggered, onRestartCompleted]);

  // Expose engine globally for MobileControls / other access
  useEffect(() => {
    window.gameEngine = engineRef.current;
    return () => {
      window.gameEngine = null;
    };
  }, [config]);

  return (
    <div className="canvas-wrapper relative flex items-center justify-center bg-black w-full h-full overflow-hidden shadow-2xl rounded-2xl border border-zinc-900">
      <canvas
        ref={canvasRef}
        className="game-canvas select-none"
        style={{
          width: '100%',
          maxHeight: '100%',
          aspectRatio: '16/9',
          display: 'block'
        }}
      />
    </div>
  );
}

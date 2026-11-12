/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, CameraMode } from './game/GameEngine';
import { InteractiveTerminal } from './game/world';
import { BottomDock } from './components/BottomDock';
import { InspectionOverlay } from './components/InspectionOverlay';
import { VirtualJoystick } from './components/VirtualJoystick';
import { foley } from './audio/FoleyEngine';
import { Terminal, Shield, Wrench, Volume2 } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state
  const [activeRegion, setActiveRegion] = useState<string>('silicon');
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [visorLightOn, setVisorLightOn] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(false);

  // Terminal interaction state
  const [nearbyTerminal, setNearbyTerminal] = useState<InteractiveTerminal | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<InteractiveTerminal | null>(null);

  // Audio start prompt state (browsers require user interaction before audio starts)
  const [hasAudioStarted, setHasAudioStarted] = useState<boolean>(false);

  // 1. Initialize 3D Engine on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    // Handle nearby terminal detection
    engine.onNearbyTerminalChange = (term) => {
      setNearbyTerminal(term);
    };

    // Detect touch device
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      setShowTouchControls(true);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // 2. Handle Keyboard Interact [E]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        if (nearbyTerminal && !activeTerminal) {
          foley.playRelayClick(true);
          setActiveTerminal(nearbyTerminal);
        } else if (activeTerminal) {
          setActiveTerminal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyTerminal, activeTerminal]);

  // Audio start on first user interaction
  const handleStartAudio = () => {
    foley.init();
    foley.ensureContext();
    setHasAudioStarted(true);
  };

  const handleSelectRegion = (regionId: string) => {
    setActiveRegion(regionId);
    if (engineRef.current) {
      engineRef.current.setRegion(regionId);
    }
  };

  const handleSelectCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    if (engineRef.current) {
      engineRef.current.cameraMode = mode;
      foley.playRelayClick(true);
    }
  };

  const handleToggleVisor = () => {
    const next = !visorLightOn;
    setVisorLightOn(next);
    if (engineRef.current) {
      engineRef.current.character.toggleVisorLight();
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    foley.setMuted(next);
  };

  const handleTerminalSolved = (termId: string) => {
    if (engineRef.current) {
      engineRef.current.world.solveTerminal(termId);
    }
  };

  const handleDamagePlayer = (amount: number) => {
    if (engineRef.current) {
      engineRef.current.character.damage(amount);
    }
  };

  return (
    <div
      onClick={!hasAudioStarted ? handleStartAudio : undefined}
      className="relative h-screen w-screen overflow-hidden bg-black font-sans select-none"
    >
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Top-Left Minimal Specification Badge (Adhering to Three.js Ergonomics) */}
      <div className="pointer-events-none fixed top-4 left-4 z-20 flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 shadow-xl">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-amber-400" />
          <h1 className="font-mono text-sm font-bold tracking-widest text-zinc-100">
            THE LAST COMPONENT (SON BİLEŞEN)
          </h1>
        </div>
        <p className="font-mono text-[10px] text-zinc-400 tracking-wider">
          BİR ENES ÖZTÜRK BAŞYAPITI // SİBER-ARKEOLOJİ & MAKRO-DONANIM
        </p>

        {/* Diegetic Zero-HUD Tip */}
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Sıfır-HUD: Tüm can ve gerilim verileri sırt çantasındaki CRT ekrandan okunur [Tab]</span>
        </div>
      </div>

      {/* Initial Audio Activation Banner */}
      {!hasAudioStarted && (
        <div className="pointer-events-auto fixed top-4 right-4 z-30 flex items-center gap-2 rounded-xl border border-amber-600/50 bg-amber-950/70 px-4 py-2 text-xs font-mono text-amber-200 shadow-xl cursor-pointer hover:bg-amber-900/80 transition">
          <Volume2 className="h-4 w-4 text-amber-400" />
          <span>Organik Stüdyo Foley Seslerini Başlatmak İçin Tıklayın</span>
        </div>
      )}

      {/* Diegetic In-World Interaction Prompt */}
      {nearbyTerminal && !activeTerminal && (
        <div className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border-2 border-emerald-500 bg-zinc-950/90 px-5 py-2.5 shadow-2xl transition-all">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-300">
              {nearbyTerminal.promptText}
            </span>
            <button
              onClick={() => {
                foley.playRelayClick(true);
                setActiveTerminal(nearbyTerminal);
              }}
              className="ml-2 rounded border border-emerald-600 bg-emerald-950 px-2 py-0.5 font-mono text-[11px] text-emerald-200 hover:bg-emerald-800"
            >
              Aç
            </button>
          </div>
        </div>
      )}

      {/* Hardware Inspection Workbench Modal */}
      {activeTerminal && (
        <InspectionOverlay
          terminal={activeTerminal}
          onClose={() => setActiveTerminal(null)}
          onSolve={handleTerminalSolved}
          onDamagePlayer={handleDamagePlayer}
        />
      )}

      {/* Touch Screen Virtual Joystick */}
      {showTouchControls && !activeTerminal && (
        <VirtualJoystick
          onMove={(vec) => {
            if (engineRef.current) {
              engineRef.current.virtualJoystick = vec;
            }
          }}
          onSprintToggle={(sprint) => {
            if (engineRef.current) {
              engineRef.current.keys['ShiftLeft'] = sprint;
            }
          }}
          onInteract={() => {
            if (nearbyTerminal) {
              foley.playRelayClick(true);
              setActiveTerminal(nearbyTerminal);
            }
          }}
          canInteract={!!nearbyTerminal}
        />
      )}

      {/* Sleek Ergonomic Collapsible Bottom Control Dock */}
      <BottomDock
        activeRegion={activeRegion}
        onSelectRegion={handleSelectRegion}
        cameraMode={cameraMode}
        onSelectCameraMode={handleSelectCameraMode}
        visorLightOn={visorLightOn}
        onToggleVisor={handleToggleVisor}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        showTouchControls={showTouchControls}
        onToggleTouchControls={() => setShowTouchControls(!showTouchControls)}
      />
    </div>
  );
}

/**
 * BottomDock.tsx - Ergonomic Collapsible Bottom Control Dock
 * Follows Three.js Guidelines:
 * - Pinned to bottom center with zero viewport occlusion
 * - Collapsible "Zen Mode" toggle with clean transition
 * - Static badges (zero pulsating dots)
 * - Region warp, camera modes, cyber-visor, audio foley, and control legend
 */

import React, { useState, useEffect } from 'react';
import { CameraMode } from '../game/GameEngine';
import {
  Compass,
  Eye,
  Flashlight,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Gamepad2,
  Monitor,
} from 'lucide-react';
import { foley } from '../audio/FoleyEngine';

interface BottomDockProps {
  activeRegion: string;
  onSelectRegion: (regionId: string) => void;
  cameraMode: CameraMode;
  onSelectCameraMode: (mode: CameraMode) => void;
  visorLightOn: boolean;
  onToggleVisor: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeRegion,
  onSelectRegion,
  cameraMode,
  onSelectCameraMode,
  visorLightOn,
  onToggleVisor,
  isMuted,
  onToggleMute,
  showTouchControls,
  onToggleTouchControls,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Keyboard shortcut 'H' to toggle dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const regions = [
    { id: 'silicon', name: 'Silikon Kanyonları', icon: '⚡' },
    { id: 'copper', name: 'Bakır Ormanları', icon: '🌲' },
    { id: 'vacuum', name: 'Vakum Odaları', icon: '💡' },
    { id: 'magnetic', name: 'Manyetik Çekirdek', icon: '🧲' },
    { id: 'nitrogen', name: 'Sıvı Azot Denizi', icon: '❄️' },
  ];

  return (
    <>
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-mono text-base font-bold text-amber-400">
                KONTROL ŞEMASI & DİEGETİK ARAYÜZ
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-zinc-400 hover:text-white font-mono text-sm"
              >
                [Kapat]
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs text-zinc-300">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">W, A, S, D / Ok Tuşları</span>
                <span>Enes Öztürk Hareket Fiziği (Momentum)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">Shift (Sol)</span>
                <span>Koşma / Depar (Sırt Çantası Ağırlığıyla Orantılı)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">E / Dokunmatik</span>
                <span>Devre Tamiri / Osiloskop Kulesi ile Etkileşim</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">Tab</span>
                <span>Sırt Çantası CRT Teçhizat İnceleme Modu</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">F</span>
                <span>Kask Siber-Vizör Feneri Aç / Kapat</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-amber-300">C</span>
                <span>Sinematik Kamera Açısı</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-amber-300">H</span>
                <span>Alt Kontrol Panelini Gizle / Göster (Zen Modu)</span>
              </div>
            </div>

            <div className="mt-5 rounded border border-amber-900/40 bg-amber-950/20 p-3 font-mono text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Diegetik Sıfır-HUD Politikası:</strong> Can, stamina ve teçhizat gerilimi ekranda yapay barlar olarak değil; Enes Öztürk’ün sırtındaki kuantum osiloskobunun analog ibreleri ve katot ışınlı CRT ekranından canlı takip edilir.
            </div>
          </div>
        </div>
      )}

      {/* Main Unified Bottom Dock */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300"
        style={{
          width: 'min(940px, 94vw)',
          transform: isCollapsed ? 'translate(-50%, calc(100% - 32px))' : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Tab Handle */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              foley.playKnobClick();
            }}
            className="flex items-center gap-1.5 rounded-t-lg border-t border-x border-zinc-700 bg-zinc-900 px-4 py-1 font-mono text-[11px] text-zinc-300 hover:text-white transition shadow-lg"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
                <span>Paneli Göster [H]</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                <span>Zen Modu [H]</span>
              </>
            )}
          </button>
        </div>

        {/* Dock Container */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/95 p-3 text-zinc-100 shadow-2xl backdrop-blur-none">
          {/* Region Warp Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] font-mono text-zinc-500 uppercase tracking-wider hidden sm:inline">
              Bölge:
            </span>
            {regions.map((reg) => {
              const isActive = activeRegion === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => onSelectRegion(reg.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition ${
                    isActive
                      ? 'border-amber-500 bg-amber-950/50 text-amber-300 font-bold'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <span>{reg.icon}</span>
                  <span className="hidden md:inline">{reg.name}</span>
                </button>
              );
            })}
          </div>

          {/* Camera & Utility Tools */}
          <div className="flex items-center gap-2">
            {/* Camera Switcher */}
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs font-mono">
              <button
                onClick={() => onSelectCameraMode('follow')}
                className={`rounded px-2 py-1 transition ${
                  cameraMode === 'follow' ? 'bg-amber-600 text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Üçüncü Şahıs Takip"
              >
                Takip
              </button>
              <button
                onClick={() => onSelectCameraMode('backpack')}
                className={`flex items-center gap-1 rounded px-2 py-1 transition ${
                  cameraMode === 'backpack' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Sırt Teçhizatı / CRT İnceleme"
              >
                <Monitor className="h-3 w-3" />
                <span>CRT [Tab]</span>
              </button>
              <button
                onClick={() => onSelectCameraMode('cinematic')}
                className={`rounded px-2 py-1 transition ${
                  cameraMode === 'cinematic' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Sinematik Görünüm [C]"
              >
                Sinematik
              </button>
            </div>

            {/* Visor Light */}
            <button
              onClick={onToggleVisor}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                visorLightOn
                  ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500'
              }`}
              title="Kask Vizör Feneri [F]"
            >
              <Flashlight className="h-4 w-4" />
            </button>

            {/* Foley Sound Toggle */}
            <button
              onClick={onToggleMute}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                !isMuted
                  ? 'border-zinc-700 bg-zinc-800 text-amber-400'
                  : 'border-red-900/80 bg-red-950/40 text-red-400'
              }`}
              title={isMuted ? 'Foley Seslerini Aç' : 'Foley Seslerini Kapat'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Virtual Joystick Toggle */}
            <button
              onClick={onToggleTouchControls}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                showTouchControls
                  ? 'border-amber-500/80 bg-amber-950/40 text-amber-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500'
              }`}
              title="Dokunmatik Sanal Joystick"
            >
              <Gamepad2 className="h-4 w-4" />
            </button>

            {/* Help / Controls Guide */}
            <button
              onClick={() => setShowHelp(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white transition"
              title="Kontrol Tuşları & Bilgi"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

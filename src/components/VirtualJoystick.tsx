/**
 * VirtualJoystick.tsx - Smooth On-screen Dual Touch Joystick & Action Buttons
 * Allows seamless movement on touchscreens and mobile devices.
 */

import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (vec: { x: number; y: number }) => void;
  onSprintToggle: (sprint: boolean) => void;
  onInteract: () => void;
  canInteract: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onSprintToggle,
  onInteract,
  canInteract,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  const maxRadius = 45;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= maxRadius) {
      setKnobPos({ x: dx, y: dy });
      onMove({ x: dx / maxRadius, y: dy / maxRadius });
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * maxRadius;
      const clampedY = Math.sin(angle) * maxRadius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMove({ x: clampedX / maxRadius, y: clampedY / maxRadius });
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none">
      {/* Left Touch Joystick Base */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="pointer-events-auto absolute bottom-24 left-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-zinc-700/80 bg-zinc-950/60 touch-none shadow-xl"
      >
        {/* Knob */}
        <div
          className="h-12 w-12 rounded-full border border-amber-500/80 bg-amber-600/60 shadow-lg pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="pointer-events-auto absolute bottom-24 right-6 flex flex-col gap-3">
        {/* Interact Button */}
        {canInteract && (
          <button
            onClick={onInteract}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-950/80 font-mono text-xs font-bold text-emerald-300 shadow-xl active:scale-95 transition"
          >
            [E] İNCELE
          </button>
        )}

        {/* Sprint Button */}
        <button
          onClick={() => {
            const next = !isSprinting;
            setIsSprinting(next);
            onSprintToggle(next);
          }}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-xs font-bold shadow-xl active:scale-95 transition ${
            isSprinting
              ? 'border-amber-400 bg-amber-600 text-black'
              : 'border-zinc-700 bg-zinc-900/80 text-zinc-300'
          }`}
        >
          KOŞ
        </button>
      </div>
    </div>
  );
};

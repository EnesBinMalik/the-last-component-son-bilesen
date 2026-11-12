/**
 * InspectionOverlay.tsx - Diegetic Hardware Workbench
 * 1. Multimeter & Circuit Repair (Ohm's Law R = V / I, Resistor color code slots, spark reactions)
 * 2. Analog Frequency Modulation (Oscilloscope Knobs: Frequency, Amplitude, Phase)
 * 3. The Last Component Quantum Core Activation
 */

import React, { useState, useEffect, useRef } from 'react';
import { InteractiveTerminal } from '../game/world';
import { PUZZLES, CircuitPuzzleState, OscillatorPuzzleState } from '../game/puzzles';
import { foley } from '../audio/FoleyEngine';
import { Zap, Activity, Cpu, RotateCcw, CheckCircle2, AlertTriangle, X, Radio } from 'lucide-react';

interface InspectionOverlayProps {
  terminal: InteractiveTerminal;
  onClose: () => void;
  onSolve: (termId: string) => void;
  onDamagePlayer: (amount: number) => void;
}

export const InspectionOverlay: React.FC<InspectionOverlayProps> = ({
  terminal,
  onClose,
  onSolve,
  onDamagePlayer,
}) => {
  // Circuit Puzzle State
  const [circuit, setCircuit] = useState<CircuitPuzzleState>(() => {
    if (terminal.id === 'term_silicon_rail') return PUZZLES.siliconRail();
    if (terminal.id === 'term_vacuum_gate') return PUZZLES.vacuumGate();
    return PUZZLES.siliconRail();
  });

  // Oscillator Puzzle State
  const [osc, setOsc] = useState<OscillatorPuzzleState>(() => {
    if (terminal.id === 'term_copper_osc') return PUZZLES.copperOscillator();
    if (terminal.id === 'term_mag_sync') return PUZZLES.magneticSync();
    return PUZZLES.copperOscillator();
  });

  // Multimeter probe readings
  const [probedPad, setProbedPad] = useState<'TP1' | 'TP2' | 'TP3' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Canvas ref for CRT oscilloscope drawing
  const oscCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize sounds on open
  useEffect(() => {
    foley.playRelayClick(true);
  }, []);

  // =========================================================================
  // OSCILLOSCOPE REAL-TIME CANVAS LOOP
  // =========================================================================
  useEffect(() => {
    if (terminal.type !== 'oscilloscope') return;
    let animId: number;

    const renderOsc = () => {
      const canvas = oscCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const time = performance.now() * 0.003;

      // Dark CRT cathode background
      ctx.fillStyle = '#031409';
      ctx.fillRect(0, 0, w, h);

      // Phosphor Grid lines
      ctx.strokeStyle = 'rgba(50, 180, 90, 0.22)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center crosshair axes
      ctx.strokeStyle = 'rgba(80, 255, 120, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const centerY = h / 2;

      // 1. Target Reference Wave (Golden Carrier Sine)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffbb00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const rad = (x / w) * Math.PI * 2 * osc.targetFreq + (osc.targetPhase * Math.PI) / 180;
        const y = centerY + Math.sin(rad + time) * (osc.targetAmp * 0.85);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 2. Player Modulated Tunable Wave (Cyan Sine)
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const rad = (x / w) * Math.PI * 2 * osc.currentFreq + (osc.currentPhase * Math.PI) / 180;
        const y = centerY + Math.sin(rad + time) * (osc.currentAmp * 0.85);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Subtle CRT scanline overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      animId = requestAnimationFrame(renderOsc);
    };

    animId = requestAnimationFrame(renderOsc);
    return () => cancelAnimationFrame(animId);
  }, [terminal.type, osc.currentFreq, osc.currentAmp, osc.currentPhase]);

  // =========================================================================
  // CIRCUIT REPAIR LOGIC (OHM'S LAW R = V / I)
  // =========================================================================
  const handleSlotComponent = (socket: 'socketA' | 'socketB', componentId: string) => {
    foley.playRelayClick(true);
    setCircuit((prev) => {
      const updated = { ...prev, [socket]: componentId, isBlown: false };
      // Calculate new total resistance (series)
      const compA = updated.availableComponents.find((c) => c.id === updated.socketA);
      const compB = updated.availableComponents.find((c) => c.id === updated.socketB);
      const rA = compA?.valueOhms || 0;
      const rB = compB?.valueOhms || 0;
      const totalR = rA + rB;

      updated.currentResistanceOhms = totalR;
      // Calculate output voltage via voltage divider
      if (totalR > 0) {
        // V_out = V_source * (targetR / (totalR + targetR)) * 2 (approx ratio)
        const ratio = updated.targetResistanceOhms / totalR;
        updated.measuredVoltage = Math.min(24, Number((updated.sourceVoltage * (1 / (1 + 1 / Math.max(0.1, ratio)))).toFixed(1)));
        updated.measuredCurrentAmps = Number((updated.sourceVoltage / totalR).toFixed(2));
      } else {
        updated.measuredVoltage = updated.sourceVoltage;
        updated.measuredCurrentAmps = 0;
      }

      return updated;
    });
  };

  const handleRemoveSocket = (socket: 'socketA' | 'socketB') => {
    foley.playKnobClick();
    setCircuit((prev) => ({
      ...prev,
      [socket]: null,
      isBlown: false,
    }));
  };

  const handleTestCircuitPower = () => {
    foley.playRelayClick(true);

    const compA = circuit.availableComponents.find((c) => c.id === circuit.socketA);
    const compB = circuit.availableComponents.find((c) => c.id === circuit.socketB);
    const totalR = (compA?.valueOhms || 0) + (compB?.valueOhms || 0);

    if (totalR === 0) {
      // Short circuit!
      foley.playElectricSpark();
      onDamagePlayer(20);
      setCircuit((prev) => ({ ...prev, isBlown: true, sparkCount: prev.sparkCount + 1 }));
      setFeedbackMsg('KISA DEVRE! Bakır atlama telleri yüksek akım çekti. Sigorta patladı!');
      return;
    }

    // Check if total resistance equals target
    if (Math.abs(totalR - circuit.targetResistanceOhms) <= 10) {
      // SUCCESS!
      foley.playPuzzleSuccess();
      setCircuit((prev) => ({ ...prev, isSolved: true, isBlown: false }));
      setFeedbackMsg(`MÜKEMMEL REGÜLASYON! Çıkış voltajı tam ${circuit.targetVoltage}V seviyesine kilitlendi.`);
      onSolve(terminal.id);
    } else {
      // Overvoltage or undervoltage
      foley.playElectricSpark();
      onDamagePlayer(12);
      setCircuit((prev) => ({ ...prev, isBlown: true, sparkCount: prev.sparkCount + 1 }));
      const msg = totalR < circuit.targetResistanceOhms
        ? 'AŞIRI GERİLİM! Direnç değeri çok düşük kaldı, devre aşırı ısındı ve kıvılcım saçtı.'
        : 'YETERSİZ GERİLİM! Direnç çok yüksek, mikroçip gereken aktivasyon akımını alamıyor.';
      setFeedbackMsg(msg);
    }
  };

  const probePad = (pad: 'TP1' | 'TP2' | 'TP3') => {
    setProbedPad(pad);
    foley.playMultimeterBeep(pad === 'TP1' ? 1800 : pad === 'TP2' ? 2400 : 3000);
  };

  // =========================================================================
  // OSCILLATOR TUNING LOGIC (KNOBS)
  // =========================================================================
  const updateOscillatorParam = (param: 'currentFreq' | 'currentAmp' | 'currentPhase', value: number) => {
    foley.playKnobClick();
    foley.playOscillatorSweep(value);

    setOsc((prev) => {
      const updated = { ...prev, [param]: value };
      // Compute alignment score
      const fDiff = Math.abs(updated.currentFreq - updated.targetFreq) / updated.targetFreq;
      const aDiff = Math.abs(updated.currentAmp - updated.targetAmp) / updated.targetAmp;
      const pDiff = Math.abs(updated.currentPhase - updated.targetPhase) / 360;

      const score = Math.max(0, Math.min(100, Math.round((1 - (fDiff * 0.4 + aDiff * 0.35 + pDiff * 0.25)) * 100)));
      updated.alignmentScore = score;

      // Check lock threshold (94%+)
      if (score >= 94 && !prev.isLocked) {
        updated.isLocked = true;
        foley.playPuzzleSuccess();
        onSolve(terminal.id);
      }

      return updated;
    });
  };

  // =========================================================================
  // THE LAST COMPONENT INSTALLATION LOGIC
  // =========================================================================
  const [isCoreInserted, setIsCoreInserted] = useState(false);
  const handleInsertLastComponent = () => {
    setIsCoreInserted(true);
    foley.playPuzzleSuccess();
    onSolve(terminal.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
      <div className="relative w-full max-w-4xl rounded-xl border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-600/40 bg-amber-950/30 text-amber-400">
              {terminal.type === 'circuit' ? <Zap className="h-5 w-5" /> : terminal.type === 'oscilloscope' ? <Activity className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-amber-300 font-mono">
                {terminal.name}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                SİBER-ARKEOLOJİ ÇALIŞMA TEZGAHI // ENES ÖZTÜRK LABORATUVARI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 1. CIRCUIT BENCH PUZZLE */}
        {/* ================================================================= */}
        {terminal.type === 'circuit' && (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left: Interactive Circuit Schematic & Sockets */}
            <div className="md:col-span-7 flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                  <span>DEVRE ŞEMASI: GÜÇ DİVİDÖRÜ</span>
                  <span className="text-amber-400">HEDEF: {circuit.targetVoltage}V ({circuit.targetResistanceOhms}Ω)</span>
                </div>

                {/* Multimeter Probing Pads */}
                <div className="flex gap-2 mb-4">
                  {(['TP1', 'TP2', 'TP3'] as const).map((pad) => (
                    <button
                      key={pad}
                      onClick={() => probePad(pad)}
                      className={`flex-1 rounded border px-3 py-1.5 text-xs font-mono transition ${
                        probedPad === pad
                          ? 'border-red-500 bg-red-950/50 text-red-200'
                          : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      Ölç: {pad} {pad === 'TP1' ? '(Giriş 24V)' : pad === 'TP2' ? '(Yuva Hattı)' : '(Çıkış Rayı)'}
                    </button>
                  ))}
                </div>

                {/* Live Multimeter Readout LCD */}
                <div className="rounded border border-emerald-900/50 bg-emerald-950/30 p-3 font-mono text-emerald-400 mb-4 flex justify-around text-center">
                  <div>
                    <div className="text-[10px] text-emerald-500/80">VOLTAJ (V)</div>
                    <div className="text-xl font-bold">
                      {probedPad === 'TP1' ? '24.0 V' : probedPad === 'TP2' ? `${circuit.measuredVoltage} V` : `${circuit.targetVoltage} V`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-500/80">DİRENÇ (R)</div>
                    <div className="text-xl font-bold">{circuit.currentResistanceOhms} Ω</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-500/80">AKIM (I = V/R)</div>
                    <div className="text-xl font-bold">{circuit.measuredCurrentAmps} A</div>
                  </div>
                </div>

                {/* Hardware Sockets: Socket A & Socket B */}
                <div className="grid grid-cols-2 gap-4 my-4">
                  {(['socketA', 'socketB'] as const).map((sockKey, sIdx) => {
                    const compId = circuit[sockKey];
                    const comp = circuit.availableComponents.find((c) => c.id === compId);
                    return (
                      <div
                        key={sockKey}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition ${
                          compId
                            ? 'border-amber-500/80 bg-amber-950/20'
                            : 'border-zinc-700 bg-zinc-950/60'
                        }`}
                      >
                        <div className="text-xs font-mono text-zinc-400 mb-2">
                          YUVA #{sIdx + 1} ({sockKey === 'socketA' ? 'Seri Hat A' : 'Seri Hat B'})
                        </div>

                        {comp ? (
                          <div className="flex flex-col items-center gap-2">
                            {/* Resistor body with color bands */}
                            <div className="flex items-center justify-center h-7 w-28 rounded-full border border-amber-800 bg-[#c9986b] px-3 relative shadow-inner">
                              {comp.colorBands?.map((color, bIdx) => (
                                <div
                                  key={bIdx}
                                  className="h-full w-2 mx-1 rounded-sm"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-200">{comp.name}</span>
                            <button
                              onClick={() => handleRemoveSocket(sockKey)}
                              className="text-[11px] font-mono text-red-400 underline hover:text-red-300"
                            >
                              Sök (Çıkar)
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-mono text-zinc-500 text-center py-4">
                            [Boş Yuva] Sağdaki çekmeceden bileşen seçin
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status / Spark reaction / Test Button */}
              <div>
                {circuit.isBlown && (
                  <div className="flex items-center gap-2 rounded border border-red-800 bg-red-950/60 p-2.5 text-xs text-red-300 font-mono mb-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{feedbackMsg}</span>
                  </div>
                )}
                {circuit.isSolved && (
                  <div className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/60 p-2.5 text-xs text-emerald-300 font-mono mb-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{feedbackMsg}</span>
                  </div>
                )}

                <button
                  disabled={circuit.isSolved}
                  onClick={handleTestCircuitPower}
                  className={`w-full rounded-lg py-2.5 font-mono text-sm font-bold tracking-wider transition ${
                    circuit.isSolved
                      ? 'bg-emerald-700 text-white cursor-default'
                      : 'bg-amber-600 text-zinc-950 hover:bg-amber-500 active:scale-[0.99]'
                  }`}
                >
                  {circuit.isSolved ? '✓ DEVRE ENERJİLENDİRİLDİ (KİLİT AÇILDI)' : '⚡ DEVREYİ ENERJİLENDİR (TEST ET)'}
                </button>
              </div>
            </div>

            {/* Right: Component Tray / Inventory */}
            <div className="md:col-span-5 flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider">
                  Mekanik Alet Çantası (Direnç & Jumper Çekmecesi)
                </h3>
                <div className="space-y-2.5">
                  {circuit.availableComponents.map((comp) => {
                    const isUsed = circuit.socketA === comp.id || circuit.socketB === comp.id;
                    return (
                      <div
                        key={comp.id}
                        className={`flex items-center justify-between rounded-lg border p-2.5 transition ${
                          isUsed
                            ? 'border-zinc-800 bg-zinc-950/40 opacity-40'
                            : 'border-zinc-700 bg-zinc-800/80 hover:border-amber-600/60'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold text-zinc-200">{comp.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{comp.label}</div>
                        </div>

                        {!isUsed && !circuit.isSolved && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleSlotComponent('socketA', comp.id)}
                              className="rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-[10px] font-mono hover:bg-amber-600 hover:text-black"
                            >
                              Yuva 1
                            </button>
                            <button
                              onClick={() => handleSlotComponent('socketB', comp.id)}
                              className="rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-[10px] font-mono hover:bg-amber-600 hover:text-black"
                            >
                              Yuva 2
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/80 p-3 text-[11px] font-mono text-zinc-400">
                <div className="text-amber-400 font-bold mb-1">Mühendislik İpucu:</div>
                Ohm Kanunu gereğince seri bağlı iki direncin toplamı (R_toplam = R1 + R2) hattın gerilim düşümünü belirler. Doğru eşleşmeyi bulun.
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. OSCILLOSCOPE FREQUENCY MODULATION PUZZLE */}
        {/* ================================================================= */}
        {terminal.type === 'oscilloscope' && (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left: Dual-Trace CRT Screen */}
            <div className="md:col-span-8 flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Sarı: Taşıyıcı Referans Dalga
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Mavi: Modüle Edilen Sinyal
                </span>
              </div>

              {/* CRT Canvas */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-zinc-800 bg-black">
                <canvas
                  ref={oscCanvasRef}
                  width={640}
                  height={360}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Alignment Progress Bar */}
              <div className="mt-3 flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-400">Faz & Frekans Kilitleme (PLL):</span>
                <span className={`font-bold ${osc.alignmentScore >= 94 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  %{osc.alignmentScore} {osc.alignmentScore >= 94 ? '— KİLİTLENDİ (LOCKED)' : '— Uyumsuzluk'}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    osc.alignmentScore >= 94 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${osc.alignmentScore}%` }}
                />
              </div>
            </div>

            {/* Right: Analog Control Knobs */}
            <div className="md:col-span-4 flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="space-y-4">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  Analog Potansiyometreler
                </h3>

                {/* Knob 1: Frequency */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>Frekans (f)</span>
                    <span className="text-amber-400 font-bold">{osc.currentFreq.toFixed(1)} kHz</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    disabled={osc.isLocked}
                    value={osc.currentFreq}
                    onChange={(e) => updateOscillatorParam('currentFreq', parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Knob 2: Amplitude */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>Genlik (A)</span>
                    <span className="text-cyan-400 font-bold">{osc.currentAmp}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    disabled={osc.isLocked}
                    value={osc.currentAmp}
                    onChange={(e) => updateOscillatorParam('currentAmp', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Knob 3: Phase Angle */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>Faz Açısı (φ)</span>
                    <span className="text-emerald-400 font-bold">{osc.currentPhase}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    disabled={osc.isLocked}
                    value={osc.currentPhase}
                    onChange={(e) => updateOscillatorParam('currentPhase', parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-4">
                {osc.isLocked ? (
                  <div className="rounded-lg border border-emerald-700 bg-emerald-950/60 p-3 text-center font-mono text-xs text-emerald-300">
                    ✓ HARMONİK REZONANS KİLİTLENDİ. MEKANİK KİLİT DEVREYE GİRDİ!
                  </div>
                ) : (
                  <div className="rounded border border-zinc-800 bg-zinc-950 p-2 text-[11px] font-mono text-zinc-400 text-center">
                    Düğmeleri çevirerek mavi dalgayı sarı referans dalgayla tam çakıştırın.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. THE LAST COMPONENT (SON BİLEŞEN) CLIMAX */}
        {/* ================================================================= */}
        {terminal.type === 'last_component' && (
          <div className="mt-6 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-cyan-400/80 bg-cyan-950/40 shadow-2xl">
              <Cpu className="h-14 w-14 text-cyan-300 animate-spin" style={{ animationDuration: '24s' }} />
            </div>

            <h3 className="text-xl font-bold font-mono text-cyan-300 mb-2">
              SON BİLEŞEN: KUANTUM ÇEKİRDEK (QUANTUM DIE)
            </h3>
            <p className="max-w-xl text-xs font-mono text-zinc-300 mb-6 leading-relaxed">
              Tüm bölgelerdeki güç hatları dengelendi ve rezonans kilitlendi. İnsanlığın terk ettiği antik süper bilgisayarın yeniden uyanması için son eksik donanım modülünü kriyojenik yuvaya yerleştirin.
            </p>

            {isCoreInserted ? (
              <div className="rounded-xl border border-emerald-500 bg-emerald-950/60 p-5 text-emerald-200 font-mono text-sm max-w-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                <div className="font-bold text-base mb-1">MİSYON TAMAMLANDI: SİSTEM AKTİF!</div>
                Siber-arkeolog Enes Öztürk, Son Bileşen'i başarıyla yerine oturttu. Milyarlarca transistör ve kriyojenik pompa tam kapasiteyle çalışmaya başladı.
              </div>
            ) : (
              <button
                onClick={handleInsertLastComponent}
                className="rounded-xl border border-cyan-400 bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-3.5 font-mono text-sm font-bold text-white shadow-xl hover:from-cyan-500 hover:to-blue-500 active:scale-95 transition"
              >
                ⚡ KUANTUM ÇEKİRDEĞİ YUVAYA CİVATALA & BAŞLAT
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

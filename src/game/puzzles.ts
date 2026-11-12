/**
 * puzzles.ts - Handmade Physical Hardware Puzzles
 * 1. Circuit Repair & Ohm's Law (R = V / I) with Multimeter Probe & Resistor Color Bands
 * 2. Time & Frequency Sine Wave Modulation with Analog Knobs
 * 3. The Last Component Quantum Core Synchronization
 */

import { foley } from '../audio/FoleyEngine';

export interface CircuitPuzzleState {
  id: string;
  title: string;
  description: string;
  sourceVoltage: number; // e.g. 24V
  targetVoltage: number; // e.g. 5.0V
  targetResistanceOhms: number; // Calculated required R
  currentResistanceOhms: number;
  measuredVoltage: number;
  measuredCurrentAmps: number;
  availableComponents: {
    id: string;
    name: string;
    type: 'resistor' | 'jumper' | 'capacitor';
    valueOhms?: number;
    colorBands?: string[]; // e.g. ['brown', 'black', 'red', 'gold']
    label: string;
  }[];
  socketA: string | null; // component id slotted
  socketB: string | null;
  isBlown: boolean;
  isSolved: boolean;
  sparkCount: number;
}

export interface OscillatorPuzzleState {
  id: string;
  title: string;
  description: string;
  targetFreq: number; // e.g. 4.4 kHz
  targetAmp: number;  // e.g. 80 %
  targetPhase: number;// e.g. 45 deg
  currentFreq: number;
  currentAmp: number;
  currentPhase: number;
  alignmentScore: number; // 0 to 100%
  isLocked: boolean;
}

export const PUZZLES = {
  siliconRail: (): CircuitPuzzleState => ({
    id: 'term_silicon_rail',
    title: 'Silikon Kanyonları: Ana Güç Hattı Regülasyonu',
    description: 'Dev mikroçip 12.0V gerektirir. 24.0V giriş hattını Ohm Yasası (R = V/I) uyarınca direnç yuvalarına doğru bileşenleri takarak dengeleyin.',
    sourceVoltage: 24.0,
    targetVoltage: 12.0,
    targetResistanceOhms: 220,
    currentResistanceOhms: 0,
    measuredVoltage: 24.0,
    measuredCurrentAmps: 0,
    availableComponents: [
      { id: 'r100', name: '100Ω Direnç', type: 'resistor', valueOhms: 100, colorBands: ['#8B4513', '#000000', '#8B4513', '#FFD700'], label: '100Ω (Kahve-Siyah-Kahve)' },
      { id: 'r120', name: '120Ω Direnç', type: 'resistor', valueOhms: 120, colorBands: ['#8B4513', '#FF0000', '#8B4513', '#FFD700'], label: '120Ω (Kahve-Kırmızı-Kahve)' },
      { id: 'r220', name: '220Ω Hassas Direnç', type: 'resistor', valueOhms: 220, colorBands: ['#FF0000', '#FF0000', '#8B4513', '#FFD700'], label: '220Ω (Kırmızı-Kırmızı-Kahve)' },
      { id: 'r470', name: '470Ω Güç Direnci', type: 'resistor', valueOhms: 470, colorBands: ['#FFFF00', '#800080', '#8B4513', '#FFD700'], label: '470Ω (Sarı-Mor-Kahve)' },
      { id: 'jumper', name: 'Bakır Atlama Teli (Jumper)', type: 'jumper', valueOhms: 0, label: '0Ω Saf Bakır Köprü' },
    ],
    socketA: null,
    socketB: null,
    isBlown: false,
    isSolved: false,
    sparkCount: 0,
  }),

  vacuumGate: (): CircuitPuzzleState => ({
    id: 'term_vacuum_gate',
    title: 'Vakum Odaları: Elektron Tüpü Izgara Kutuplaması',
    description: 'Vakum tüpünün flamanını yakmadan 6.3V ısıtıcı gerilimini elde etmek için seri direnç hattını bağlayın.',
    sourceVoltage: 12.6,
    targetVoltage: 6.3,
    targetResistanceOhms: 320,
    currentResistanceOhms: 0,
    measuredVoltage: 12.6,
    measuredCurrentAmps: 0,
    availableComponents: [
      { id: 'r100', name: '100Ω Direnç', type: 'resistor', valueOhms: 100, colorBands: ['#8B4513', '#000000', '#8B4513', '#FFD700'], label: '100Ω' },
      { id: 'r220', name: '220Ω Direnç', type: 'resistor', valueOhms: 220, colorBands: ['#FF0000', '#FF0000', '#8B4513', '#FFD700'], label: '220Ω' },
      { id: 'r320', name: '320Ω Seramik Direnç', type: 'resistor', valueOhms: 320, colorBands: ['#FF8C00', '#FF0000', '#8B4513', '#FFD700'], label: '320Ω' },
      { id: 'jumper', name: 'Bakır Atlama Teli', type: 'jumper', valueOhms: 0, label: '0Ω Bakır Tel' },
    ],
    socketA: null,
    socketB: null,
    isBlown: false,
    isSolved: false,
    sparkCount: 0,
  }),

  copperOscillator: (): OscillatorPuzzleState => ({
    id: 'term_copper_osc',
    title: 'Bakır Ormanları: Sinyal Kulesi Rezonansı',
    description: 'Analog osilatör potansiyometrelerini çevirerek sarı referans dalga boyu ile mavi sinyal dalgasını üst üste bindirin.',
    targetFreq: 4.8,
    targetAmp: 75,
    targetPhase: 60,
    currentFreq: 2.2,
    currentAmp: 35,
    currentPhase: 180,
    alignmentScore: 32,
    isLocked: false,
  }),

  magneticSync: (): OscillatorPuzzleState => ({
    id: 'term_mag_sync',
    title: 'Manyetik Çekirdek: Plaka Akı Senkronizasyonu',
    description: 'Dönen disk plakalarının manyetik kutup frekansını (HDD Spindle) saat frekansıyla faz kilitlemesine (Phase-Lock Loop) sokun.',
    targetFreq: 7.2,
    targetAmp: 90,
    targetPhase: 120,
    currentFreq: 4.0,
    currentAmp: 50,
    currentPhase: 0,
    alignmentScore: 40,
    isLocked: false,
  }),
};

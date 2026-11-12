/**
 * FoleyEngine.ts - Organic Foley Sound Synthesizer
 * Built entirely with Web Audio API (zero external audio file dependencies).
 * Generates realistic industrial studio foley: footsteps on copper/silicon/ice,
 * 50Hz/60Hz transformer hum, CRT 15kHz flyback whine, relay clicks, multimeter probes,
 * rotary potentiometer clicks, electrical arcs, and harmonic machine resonance.
 */

class FoleyEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private crtGain: GainNode | null = null;
  private crtOsc: OscillatorNode | null = null;
  private fanGain: GainNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Ambient Industrial Transformer Hum (50Hz + 100Hz + 150Hz harmonic warmth)
      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.humOsc1 = this.ctx.createOscillator();
      this.humOsc1.type = 'sawtooth';
      this.humOsc1.frequency.setValueAtTime(50, this.ctx.currentTime);

      this.humOsc2 = this.ctx.createOscillator();
      this.humOsc2.type = 'sine';
      this.humOsc2.frequency.setValueAtTime(100, this.ctx.currentTime);

      const humFilter = this.ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

      this.humOsc1.connect(humFilter);
      this.humOsc2.connect(humFilter);
      humFilter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc1.start();
      this.humOsc2.start();

      // 2. High-frequency Cathode Ray Tube (CRT) flyback coil whine (subtle 12.5kHz)
      this.crtGain = this.ctx.createGain();
      this.crtGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.crtOsc = this.ctx.createOscillator();
      this.crtOsc.type = 'sine';
      this.crtOsc.frequency.setValueAtTime(11500, this.ctx.currentTime);
      this.crtOsc.connect(this.crtGain);
      this.crtGain.connect(this.masterGain);
      this.crtOsc.start();

      // 3. Ambient Industrial Airflow / Heatsink fan noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.fanFilter = this.ctx.createBiquadFilter();
      this.fanFilter.type = 'bandpass';
      this.fanFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.fanFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.fanGain = this.ctx.createGain();
      this.fanGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      whiteNoise.connect(this.fanFilter);
      this.fanFilter.connect(this.fanGain);
      this.fanGain.connect(this.masterGain);
      whiteNoise.start();

    } catch (e) {
      console.warn('AudioContext init deferred until user interaction', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  getMuted() {
    return this.isMuted;
  }

  /**
   * Footstep foley tailored to surface material
   */
  playFootstep(surface: 'copper' | 'silicon' | 'nitrogen' | 'magnetic' | 'vacuum') {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    if (surface === 'copper') {
      // Hollow metallic clack with high resonant ring
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 60, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(5.0, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.14);

    } else if (surface === 'silicon') {
      // Crisp dry ceramic click
      osc.type = 'square';
      osc.frequency.setValueAtTime(650 + Math.random() * 100, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.09);

    } else if (surface === 'nitrogen') {
      // Frosted icy crunch with noise
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.15);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2500, t);
      filter.Q.setValueAtTime(1.2, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.16);

    } else if (surface === 'magnetic') {
      // Deep heavy metallic plate thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);

    } else {
      // Vacuum: Soft muffled acoustic tap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  /**
   * Mechanical relay click (loud, satisfying dual-click contactor)
   */
  playRelayClick(engaged: boolean = true) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(engaged ? 950 : 750, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);

    // Second bounce click
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(engaged ? 1400 : 900, t2);
      osc2.frequency.exponentialRampToValueAtTime(200, t2 + 0.03);

      gain2.gain.setValueAtTime(0.2, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.03);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.035);
    }, 28);
  }

  /**
   * Rotary potentiometer knob detent click
   */
  playKnobClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.015);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.02);
  }

  /**
   * Electrical Arc / Fuse spark crackle (when circuit has wrong voltage or shorts)
   */
  playElectricSpark() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400 + Math.random() * 800, t + offset);
      osc.frequency.exponentialRampToValueAtTime(80, t + offset + 0.06);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, t + offset);

      gain.gain.setValueAtTime(0.35, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.06);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + offset);
      osc.stop(t + offset + 0.07);
    }
  }

  /**
   * Multimeter continuity / probe beep
   */
  playMultimeterBeep(frequency: number = 2400, duration: number = 0.12) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Oscilloscope frequency tone sweep (played during wave tuning)
   */
  playOscillatorSweep(freq: number) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const mappedFreq = Math.max(120, Math.min(2200, freq * 180));
    osc.frequency.setValueAtTime(mappedFreq, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Resonator / Harmonic Grid Lock - Played when an engineering puzzle is successfully solved
   */
  playPuzzleSuccess() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const chords = [220, 330, 440, 660];
    const t = this.ctx.currentTime;

    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2 + idx * 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + 1.5);
    });

    // Add mechanical clank at the end
    setTimeout(() => {
      this.playRelayClick(true);
    }, 400);
  }

  /**
   * Adjust environmental fan/vent wind based on region
   */
  setRegionAcoustics(regionId: string) {
    if (!this.ctx || !this.fanGain || !this.fanFilter || !this.humGain) return;
    const t = this.ctx.currentTime;

    switch (regionId) {
      case 'silicon':
        this.humGain.gain.setTargetAtTime(0.12, t, 0.2); // Solder heat & transformer
        this.fanGain.gain.setTargetAtTime(0.07, t, 0.2);
        this.fanFilter.frequency.setTargetAtTime(350, t, 0.2);
        break;
      case 'copper':
        this.humGain.gain.setTargetAtTime(0.18, t, 0.2); // Heavy copper buzz
        this.fanGain.gain.setTargetAtTime(0.03, t, 0.2);
        break;
      case 'vacuum':
        this.humGain.gain.setTargetAtTime(0.02, t, 0.2); // Silent vacuum
        this.fanGain.gain.setTargetAtTime(0.01, t, 0.2);
        break;
      case 'magnetic':
        this.humGain.gain.setTargetAtTime(0.15, t, 0.2); // Spindle motor rotational hum
        this.fanGain.gain.setTargetAtTime(0.09, t, 0.2);
        this.fanFilter.frequency.setTargetAtTime(600, t, 0.2);
        break;
      case 'nitrogen':
        this.humGain.gain.setTargetAtTime(0.05, t, 0.2);
        this.fanGain.gain.setTargetAtTime(0.14, t, 0.2); // High cryogenic vapor rush
        this.fanFilter.frequency.setTargetAtTime(800, t, 0.2);
        break;
    }
  }
}

export const foley = new FoleyEngine();

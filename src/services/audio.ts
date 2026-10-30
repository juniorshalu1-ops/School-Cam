/**
 * Web Audio API synthesized camera shutter sound & haptic feedback
 */

class SoundService {
  private audioCtx: AudioContext | null = null;

  private initCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playShutterSound(enabled: boolean = true) {
    if (!enabled) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // 1. Initial mechanical "click-up" impulse
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.04);

      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // 2. Realistic shutter mechanical mirror slap / spring sound
      const bufferSize = this.audioCtx.sampleRate * 0.08;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now + 0.03);
      filter.Q.setValueAtTime(1.5, now + 0.03);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);
      noise.start(now + 0.03);

      // 3. Crisp secondary click
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(850, now + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(100, now + 0.14);

      gain2.gain.setValueAtTime(0.6, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio synthesis playback warning:', e);
    }
  }

  public playBeep(freq = 600, duration = 0.08) {
    try {
      this.initCtx();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // ignore
    }
  }

  public triggerHaptic(type: 'click' | 'shutter' | 'success' = 'click', enabled: boolean = true) {
    if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (type === 'shutter') {
        navigator.vibrate([20, 30, 40]);
      } else if (type === 'success') {
        navigator.vibrate([15, 20, 15, 30]);
      } else {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
  }
}

export const soundService = new SoundService();

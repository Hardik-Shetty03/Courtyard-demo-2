// src/utils/audio.ts

/**
 * Plays a loud, attention-grabbing digital alarm sound using the Web Audio API.
 * Synthesizes a sawtooth wave buzzer so it works offline and requires no audio files.
 */
export function playAlarmSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (time: number, freq: number, duration: number, type: OscillatorType = 'sawtooth') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      // Set volume gain
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    
    // Distinct double-buzzer sequence (like a scoreboard timer)
    playTone(now, 987.77, 0.15, 'sawtooth'); // B5
    playTone(now + 0.05, 880.00, 0.15, 'sawtooth'); // A5
    
    playTone(now + 0.3, 987.77, 0.15, 'sawtooth');
    playTone(now + 0.35, 880.00, 0.15, 'sawtooth');
    
    playTone(now + 0.6, 987.77, 0.45, 'sawtooth');
    playTone(now + 0.65, 880.00, 0.45, 'sawtooth');
  } catch (e) {
    console.error('Web Audio API alarm sound failed:', e);
  }
}

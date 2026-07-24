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
    
    // Pulsing warning buzzer sequence (10 pulses, 0.5s intervals = 5 seconds total duration)
    for (let i = 0; i < 10; i++) {
      const timeOffset = i * 0.5;
      // Synthesize combined sawtooth and sine waves for a rich, attention-grabbing digital scoreboard buzz
      playTone(now + timeOffset, 880.00, 0.4, 'sawtooth'); // A5
      playTone(now + timeOffset, 987.77, 0.4, 'sine');     // B5
    }
  } catch (e) {
    console.error('Web Audio API alarm sound failed:', e);
  }
}

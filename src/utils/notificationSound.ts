/**
 * Plays a notification sound.
 * Tries /notification.mp3 first; falls back to Web Audio API synthesized tone if the file isn't available.
 */
export const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
            // File missing or browser blocked autoplay — fall back to synthesized tone
            playSynthSound();
        });
    } catch {
        playSynthSound();
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
};

function playSynthSound() {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        playTone(880, ctx.currentTime, 0.25, 0.4);
        playTone(1100, ctx.currentTime + 0.22, 0.25, 0.3);
    } catch {
        // Audio not supported — silently skip
    }
}

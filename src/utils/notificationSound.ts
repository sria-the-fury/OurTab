let audioContext: AudioContext | null = null;

/**
 * Initializes the AudioContext on user interaction to comply with browser autoplay policies.
 */
export const initAudio = () => {
    if (typeof window === 'undefined') return;

    const handleInteraction = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Remove listeners once initialized
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
};

/**
 * Plays a notification sound.
 * Tries /notification.mp3 first; falls back to Web Audio API synthesized tone.
 */
export const playNotificationSound = () => {
    if (typeof window === 'undefined') return;

    // Try playing the MP3 file first
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;

    audio.play().catch(() => {
        // Autoplay blocked or file missing - use synthesized sound
        playSynthSound();
    });

    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
};

function playSynthSound() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
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
    } catch (e) {
        console.warn('Web Audio synthesis failed:', e);
    }
}

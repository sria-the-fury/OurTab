export const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => {
            // Browsers block audio without user interaction, ignore this error quietly
            console.log('Audio playback prevented by browser:', e.message);
        });

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    } catch (e) {
        console.error('Error playing notification sound', e);
    }
};

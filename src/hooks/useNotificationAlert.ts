'use client';

import { useEffect, useRef } from 'react';

/**
 * Plays a subtle notification sound using the Web Audio API.
 * No external file needed — generated entirely in the browser.
 */
export function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
    } catch {
        // Audio not available — silently skip
    }
}

/**
 * Requests browser notification permission if not yet granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
}

/**
 * Shows a browser native notification.
 */
export function showBrowserNotification(title: string, body: string, icon?: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, icon: icon || '/favicon.ico', silent: true });
    setTimeout(() => n.close(), 6000);
}

/**
 * Hook: tracks the previous unread count and triggers sound + browser alert on increase.
 */
export function useNotificationAlert(unreadCount: number, latestNotification?: { senderName?: string; message?: string; senderPhotoUrl?: string }) {
    const prevUnreadRef = useRef<number | null>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Request permission once on mount
        requestNotificationPermission();
    }, []);

    useEffect(() => {
        // Skip on first load to avoid alerting for existing notifications
        if (!hasInitialized.current) {
            if (unreadCount !== undefined) {
                prevUnreadRef.current = unreadCount;
                hasInitialized.current = true;
            }
            return;
        }

        const prev = prevUnreadRef.current ?? 0;
        if (unreadCount > prev) {
            // New notification(s) arrived!
            playNotificationSound();

            const senderName = latestNotification?.senderName || 'OurTab';
            const message = latestNotification?.message || 'You have a new notification.';
            showBrowserNotification(senderName, message, latestNotification?.senderPhotoUrl);
        }

        prevUnreadRef.current = unreadCount;
    }, [unreadCount, latestNotification]);
}

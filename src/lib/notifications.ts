import { adminDb } from '@/lib/firebaseAdmin';
import { AppNotification } from '@/types/notification';

export async function createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    try {
        const newDoc: Omit<AppNotification, 'id'> = {
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
        };
        await adminDb.collection('notifications').add(newDoc);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { AppNotification } from '@/types/notification';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // --- Birthday Notification Logic ---
        // Fetch current user's house
        const userSnap = await adminDb.collection('users').doc(userId).get();
        if (userSnap.exists) {
            const userData = userSnap.data()!;
            const houseId = userData.houseId;

            if (houseId) {
                const houseSnap = await adminDb.collection('houses').doc(houseId).get();
                if (houseSnap.exists) {
                    const houseData = houseSnap.data()!;
                    const members = houseData.members || [];

                    const now = new Date();
                    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    const tomorrowStr = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                    const currentYear = now.getFullYear();

                    for (const member of members) {
                        if (member.email === userId) continue; // Don't notify self

                        // Fetch member's data for birthday
                        const memberSnap = await adminDb.collection('users').doc(member.email).get();
                        if (memberSnap.exists) {
                            const memberData = memberSnap.data()!;
                            if (memberData.birthday === tomorrowStr) {
                                // Check if notification already exists for THIS YEAR's birthday
                                const notifId = `birthday-${member.email}-${currentYear}-${userId}`;
                                const notifRef = adminDb.collection('notifications').doc(notifId);
                                const notifSnap = await notifRef.get();

                                if (!notifSnap.exists) {
                                    await notifRef.set({
                                        userId: userId,
                                        title: 'Birthday Celebration! 🎂',
                                        message: `Tomorrow is ${memberData.name || member.email}'s birthday! Get ready to celebrate! 🎉`,
                                        type: 'birthday',
                                        read: false,
                                        createdAt: new Date().toISOString()
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // --- End Birthday Logic ---

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .get();

        let notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AppNotification[];

        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        const notificationsToDelete = notifications.filter(n => {
            if (!n.read) return false;
            const createdDate = new Date(n.createdAt!);
            return createdDate < twoDaysAgo;
        });

        if (notificationsToDelete.length > 0) {
            const batch = adminDb.batch();
            notificationsToDelete.forEach(n => {
                if (n.id) {
                    const ref = adminDb.collection('notifications').doc(n.id);
                    batch.delete(ref);
                }
            });
            await batch.commit();

            // Remove from the array we return
            const idsToDelete = new Set(notificationsToDelete.map(n => n.id));
            notifications = notifications.filter(n => !idsToDelete.has(n.id));
        }

        // Sort by createdAt desc in memory to avoid needing a Firebase composite index
        notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        // Limit to 50
        notifications = notifications.slice(0, 50);

        console.log(`--- DEBUG FETCH NOTIFICATIONS for ${userId} ---`);
        console.log(`Found ${notifications.length} notifications`);

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { notificationIds, markAllRead, userId } = body;

        if (markAllRead && userId) {
            const batch = adminDb.batch();
            const unreadSnap = await adminDb
                .collection('notifications')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();

            unreadSnap.docs.forEach((doc) => {
                batch.update(doc.ref, { read: true });
            });

            await batch.commit();
            return NextResponse.json({ success: true, count: unreadSnap.size });
        }

        if (notificationIds && Array.isArray(notificationIds)) {
            const batch = adminDb.batch();
            notificationIds.forEach((id) => {
                const ref = adminDb.collection('notifications').doc(id);
                batch.update(ref, { read: true });
            });
            await batch.commit();
            return NextResponse.json({ success: true, count: notificationIds.length });
        }

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Error updating notifications' }, { status: 500 });
    }
}

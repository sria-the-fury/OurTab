import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { AppNotification } from '@/types/notification';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    try {
        // --- 1. Birthday Check Logic ---
        // Check if any house members have a birthday tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const day = tomorrow.getDate().toString().padStart(2, '0');
        const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
        const birthdayStr = `${day}-${month}`; // DD-MM format

        const userHousesSnap = await adminDb.collection('houses')
            .where('members', 'array-contains', userId)
            .get();

        for (const houseDoc of userHousesSnap.docs) {
            const houseData = houseDoc.data();
            const members = houseData.members || [];
            const memberDetails = houseData.memberDetails || {};

            for (const memberEmail of members) {
                // Skip if it's the current user themselves (or handle as you wish)
                // if (memberEmail === userId) continue;

                const memberData = memberDetails[memberEmail];
                if (memberData?.birthday === birthdayStr) {
                    // Create a notification for the current user about this member's birthday
                    // Only if not already notified today
                    const notifId = `birthday_${memberEmail}_${new Date().toISOString().split('T')[0]}_for_${userId}`;
                    const notifRef = adminDb.collection('notifications').doc(notifId);
                    const notifSnap = await notifRef.get();

                    if (!notifSnap.exists) {
                        const title = 'Birthday Celebration! 🎂';
                        const message = `Tomorrow is ${memberData.name || memberEmail}'s birthday! Get ready to celebrate! 🎉`;
                        await notifRef.set({
                            userId: userId,
                            title,
                            message,
                            type: 'birthday',
                            read: false,
                            createdAt: new Date().toISOString()
                        });

                        // Send push notification
                        await sendPushNotification(userId, title, message);
                    }
                }
            }
        }

        // --- 2. Fetch Notifications ---
        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .get();

        let notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AppNotification[];

        // Sort by createdAt desc in memory to avoid needing a Firebase composite index
        notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        // Limit to 50
        notifications = notifications.slice(0, 50);

        // --- 3. Cleanup Old Notifications (Optional/Background) ---
        // Cleanup notifications older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // This is a bit slow, so we just trigger it and don't await fully for every request
        // Better: user a scheduled cloud function
        adminDb.collection('notifications')
            .where('userId', '==', userId)
            .where('createdAt', '<', thirtyDaysAgo.toISOString())
            .get()
            .then(oldSnap => {
                if (!oldSnap.empty) {
                    const batch = adminDb.batch();
                    oldSnap.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    batch.commit().catch(e => console.error('Error cleaning up old notifications:', e));
                }
            });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { notificationIds, ids, markAllRead, userId, read } = body;

        // Use notificationIds if ids is not provided (for compatibility with useNotifications.ts)
        const targetIds = notificationIds || ids;

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

        if (targetIds && Array.isArray(targetIds)) {
            const batch = adminDb.batch();
            targetIds.forEach((id: string) => {
                const ref = adminDb.collection('notifications').doc(id);
                // Default to true if read is not provided
                batch.update(ref, { read: read !== undefined ? read : true });
            });
            await batch.commit();
            return NextResponse.json({ success: true, count: targetIds.length });
        }

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
        return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    try {
        await adminDb.collection('notifications').doc(notificationId).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

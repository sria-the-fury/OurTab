import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const notificationsRef = collection(db, 'notifications');
        // Simple query for now. Index might be needed for compound query with orderBy
        const q = query(
            notificationsRef,
            where("recipientId", "==", userId)
            // orderBy("createdAt", "desc") // Requires index
        );

        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Manual sort if index is missing/not working yet
        notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { notificationIds } = body; // Expecting array of IDs to mark as read

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const batch = writeBatch(db);
        notificationIds.forEach((id: string) => {
            const ref = doc(db, 'notifications', id);
            batch.update(ref, { read: true });
        });

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

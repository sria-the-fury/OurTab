import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail } = body;

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'HouseId and UserEmail required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        let members: string[] = houseData.members || [];

        if (!members.includes(userEmail)) {
            return NextResponse.json({ error: 'User not in house' }, { status: 400 });
        }

        // Remove user from house members array
        if (members.length <= 1) {
            members = members.filter(m => m !== userEmail);

            const batch = adminDb.batch();

            // Update house document
            batch.update(houseRef, { members });

            // Remove houseId from user document
            const userRef = adminDb.collection('users').doc(userEmail);
            batch.update(userRef, { houseId: null });

            await batch.commit();

            // Notify everyone else that user left
            try {
                const userSnap = await adminDb.collection('users').doc(userEmail).get();
                const userName = userSnap.exists ? (userSnap.data()?.name || userEmail.split('@')[0]) : userEmail.split('@')[0];
                const userPhotoUrl = userSnap.exists ? userSnap.data()?.photoUrl : undefined;

                const notifications = members.map((m: string) =>
                    createNotification({
                        userId: m,
                        type: 'house',
                        message: `has left the house.`,
                        senderName: userName,
                        senderPhotoUrl: userPhotoUrl
                    })
                );
                await Promise.all(notifications);
            } catch (err) { console.error('Error notifying leave', err); }

            return NextResponse.json({ success: true, left: true });
        } else {
            const leaveRequests = houseData.leaveRequests || {};
            leaveRequests[userEmail] = {
                approvals: [],
                createdAt: new Date().toISOString()
            };

            await houseRef.update({ leaveRequests });

            // Notify everyone else that user requested to leave
            try {
                const userSnap = await adminDb.collection('users').doc(userEmail).get();
                const userName = userSnap.exists ? (userSnap.data()?.name || userEmail.split('@')[0]) : userEmail.split('@')[0];
                const userPhotoUrl = userSnap.exists ? userSnap.data()?.photoUrl : undefined;

                const notifications = members
                    .filter(m => m !== userEmail)
                    .map((m: string) =>
                        createNotification({
                            userId: m,
                            type: 'house',
                            message: `wants to leave. Please check any remaining settlement and approve.`,
                            senderName: userName,
                            senderPhotoUrl: userPhotoUrl
                        })
                    );
                await Promise.all(notifications);
            } catch (err) { console.error('Error notifying leave request', err); }

            return NextResponse.json({ success: true, left: false, pendingApproval: true });
        }
    } catch (error) {
        console.error('Leave house error', error);
        return NextResponse.json({ error: 'Failed to leave house' }, { status: 500 });
    }
}

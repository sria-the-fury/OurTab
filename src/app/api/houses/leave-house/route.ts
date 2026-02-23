import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail } = body;

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'HouseId and UserEmail required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);
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

            // Remove groupId from user document
            const userRef = adminDb.collection('users').doc(userEmail);
            batch.update(userRef, { groupId: null });

            await batch.commit();

            return NextResponse.json({ success: true, left: true });
        } else {
            const leaveRequests = houseData.leaveRequests || {};
            leaveRequests[userEmail] = {
                approvals: [],
                createdAt: new Date().toISOString()
            };

            await houseRef.update({ leaveRequests });
            return NextResponse.json({ success: true, left: false, pendingApproval: true });
        }
    } catch (error) {
        console.error('Leave house error', error);
        return NextResponse.json({ error: 'Failed to leave house' }, { status: 500 });
    }
}

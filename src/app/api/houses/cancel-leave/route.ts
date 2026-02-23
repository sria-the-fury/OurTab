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
        const leaveRequests = houseData.leaveRequests || {};

        if (!leaveRequests[userEmail]) {
            return NextResponse.json({ error: 'No leave request found' }, { status: 400 });
        }

        delete leaveRequests[userEmail];
        await houseRef.update({ leaveRequests });

        return NextResponse.json({ success: true, cancelled: true });
    } catch (error) {
        console.error('Cancel leave error', error);
        return NextResponse.json({ error: 'Failed to cancel leave' }, { status: 500 });
    }
}

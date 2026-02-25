import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const { houseId, userEmail } = await request.json();

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'houseId and userEmail are required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const deletionRequest = houseData.deletionRequest;

        if (!deletionRequest) {
            return NextResponse.json({ error: 'No pending deletion request' }, { status: 400 });
        }

        if (deletionRequest.initiatedBy !== userEmail) {
            return NextResponse.json({ error: 'Only the initiator can cancel' }, { status: 403 });
        }

        await houseRef.update({ deletionRequest: null });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cancel deletion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

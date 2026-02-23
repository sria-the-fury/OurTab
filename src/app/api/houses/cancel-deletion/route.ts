import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { houseId, userEmail } = await request.json();

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'houseId and userEmail are required' }, { status: 400 });
        }

        const houseRef = doc(db, 'groups', houseId);
        const houseSnap = await getDoc(houseRef);

        if (!houseSnap.exists()) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data();
        const deletionRequest = houseData.deletionRequest;

        if (!deletionRequest) {
            return NextResponse.json({ error: 'No pending deletion request' }, { status: 400 });
        }

        if (deletionRequest.initiatedBy !== userEmail) {
            return NextResponse.json({ error: 'Only the initiator can cancel' }, { status: 403 });
        }

        await updateDoc(houseRef, { deletionRequest: null });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cancel deletion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail, targetEmail, role, rentAmount } = body;

        if (!houseId || !userEmail || !targetEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        // Check if requester is a manager (or the creator for legacy houses)
        const isCreator = houseData.createdBy === userEmail;
        const isManager = houseData.memberDetails?.[userEmail]?.role === 'manager';

        if (!isCreator && !isManager) {
            return NextResponse.json({ error: 'Unauthorized. Only managers can update member settings.' }, { status: 403 });
        }

        // Only allow updating members that are currently in the house
        if (!houseData.members.includes(targetEmail)) {
            return NextResponse.json({ error: 'Target user is not a member of this house.' }, { status: 400 });
        }

        // Use set with merge: true to gracefully handle the case where memberDetails doesn't exist
        const memberDataToUpdate: any = {};
        if (role !== undefined) memberDataToUpdate.role = role;
        if (rentAmount !== undefined) memberDataToUpdate.rentAmount = Number(rentAmount);

        if (Object.keys(memberDataToUpdate).length > 0) {
            await houseRef.set({
                memberDetails: {
                    [targetEmail]: memberDataToUpdate
                }
            }, { merge: true });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating member member settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

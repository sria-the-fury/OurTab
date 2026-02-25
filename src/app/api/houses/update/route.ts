import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, currency, userEmail } = body;

        if (!houseId || !currency || !userEmail) {
            return NextResponse.json({ error: 'HouseId, Currency and UserEmail are required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        if (!houseData.members.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await houseRef.update({ currency });

        return NextResponse.json({ success: true, currency });
    } catch (error) {
        console.error('Error updating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

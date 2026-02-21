import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, currency, userEmail } = body;

        if (!houseId || !currency || !userEmail) {
            return NextResponse.json({ error: 'HouseId, Currency and UserEmail are required' }, { status: 400 });
        }

        const houseRef = doc(db, 'groups', houseId);
        const houseSnap = await getDoc(houseRef);

        if (!houseSnap.exists()) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data();
        if (!houseData.members.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await updateDoc(houseRef, { currency });

        return NextResponse.json({ success: true, currency });
    } catch (error) {
        console.error('Error updating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

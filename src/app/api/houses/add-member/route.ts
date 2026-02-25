import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, houseId } = body;

        if (!email || !houseId) {
            return NextResponse.json({ error: 'Email and HouseId are required' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(email);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found. Ask them to sign up first.' }, { status: 404 });
        }

        const userData = userSnap.data()!;
        if (userData.houseId || userData.groupId) {
            return NextResponse.json({ error: 'User is already in a house.' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        await houseRef.update({
            members: FieldValue.arrayUnion(email)
        });

        await userRef.update({ houseId: houseId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

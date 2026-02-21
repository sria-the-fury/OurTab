import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, houseId } = body;

        if (!email || !houseId) {
            return NextResponse.json({ error: 'Email and HouseId are required' }, { status: 400 });
        }

        const userRef = doc(db, 'users', email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found. Ask them to sign up first.' }, { status: 404 });
        }

        const userData = userSnap.data();
        if (userData.groupId) {
            return NextResponse.json({ error: 'User is already in a house.' }, { status: 400 });
        }

        const houseRef = doc(db, 'groups', houseId);
        await updateDoc(houseRef, {
            members: arrayUnion(email)
        });

        await updateDoc(userRef, {
            groupId: houseId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

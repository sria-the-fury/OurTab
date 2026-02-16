import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, groupId } = body;

        if (!email || !groupId) {
            return NextResponse.json({ error: 'Email and GroupID are required' }, { status: 400 });
        }

        // 1. Check if user exists (by email ID)
        const userRef = doc(db, 'users', email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found. Ask them to sign up first.' }, { status: 404 });
        }

        const userData = userSnap.data();
        if (userData.groupId) {
            return NextResponse.json({ error: 'User is already in a group.' }, { status: 400 });
        }

        // 2. Add user to Group's members array
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
            members: arrayUnion(email)
        });

        // 3. Update User's groupId
        await updateDoc(userRef, {
            groupId: groupId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

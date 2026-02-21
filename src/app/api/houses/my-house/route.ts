import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        // 1. Get User to find houseId (stored as groupId)
        const userRef = doc(db, 'users', email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userSnap.data();
        if (!userData.groupId) {
            return NextResponse.json(null); // No house
        }

        // 2. Get House Data
        const houseRef = doc(db, 'groups', userData.groupId);
        const houseSnap = await getDoc(houseRef);

        if (!houseSnap.exists()) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data();

        // 3. Fetch details for all members
        const memberPromises = houseData.members.map(async (memberEmail: string) => {
            const memberRef = doc(db, 'users', memberEmail);
            const memberSnap = await getDoc(memberRef);
            return memberSnap.exists() ? { email: memberEmail, ...memberSnap.data() } : { email: memberEmail };
        });

        const members = await Promise.all(memberPromises);

        return NextResponse.json({
            id: houseSnap.id,
            ...houseData,
            members
        });

    } catch (error) {
        console.error('Error fetching house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

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
        // 1. Get User to find groupId
        const userRef = doc(db, 'users', email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userSnap.data();
        if (!userData.groupId) {
            return NextResponse.json(null); // No group
        }

        // 2. Get Group Data
        const groupRef = doc(db, 'groups', userData.groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const groupData = groupSnap.data();

        // 3. Fetch details for all members
        const memberPromises = groupData.members.map(async (memberEmail: string) => {
            const memberRef = doc(db, 'users', memberEmail);
            const memberSnap = await getDoc(memberRef);
            return memberSnap.exists() ? { email: memberEmail, ...memberSnap.data() } : { email: memberEmail };
        });

        const members = await Promise.all(memberPromises);

        return NextResponse.json({
            id: groupSnap.id,
            ...groupData,
            members // Return full member objects
        });

    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { groupId, currency, userEmail } = body;

        if (!groupId || !currency || !userEmail) {
            return NextResponse.json({ error: 'GroupId, Currency and UserEmail are required' }, { status: 400 });
        }

        // Validate that user belongs to the group (security check)
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const groupData = groupSnap.data();
        if (!groupData.members.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update
        await updateDoc(groupRef, { currency });

        return NextResponse.json({ success: true, currency });
    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

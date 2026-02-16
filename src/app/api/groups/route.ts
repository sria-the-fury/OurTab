import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, deleteDoc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, createdBy, currency } = body;

        if (!name || !createdBy) {
            return NextResponse.json({ error: 'Name and CreatedBy are required' }, { status: 400 });
        }

        // 1. Check if user is already in a group
        const userCheckRef = doc(db, 'users', createdBy);
        const userSnap = await getDoc(userCheckRef);

        if (userSnap.exists() && userSnap.data().groupId) {
            return NextResponse.json({ error: 'User is already in a group' }, { status: 400 });
        }

        // 2. Create Group Doc
        const groupRef = await addDoc(collection(db, 'groups'), {
            name,
            createdBy,
            members: [createdBy], // Initialize with creator
            currency: currency || 'USD',
            createdAt: new Date().toISOString()
        });

        // 2. Update User Doc with groupId
        const userRef = doc(db, 'users', createdBy);
        // Use setDoc with merge to ensure user doc exists even if api/users call failed or was delayed
        await setDoc(userRef, { groupId: groupRef.id }, { merge: true });

        return NextResponse.json({ id: groupRef.id, name, createdBy });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    // Get all groups (For dashboard listing/debugging)
    try {
        const snapshot = await getDocs(collection(db, 'groups'));
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(groups);
    } catch (e) {
        return NextResponse.json([]);
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { groupId, userEmail } = body;

        if (!groupId || !userEmail) {
            return NextResponse.json({ error: 'GroupId and UserEmail required' }, { status: 400 });
        }

        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const groupData = groupSnap.data();

        // Strict check if user is creator
        if (groupData.createdBy !== userEmail) {
            return NextResponse.json({ error: 'Only creator can delete' }, { status: 403 });
        }

        // Remove group from all members
        const updates = groupData.members.map(async (memberEmail: string) => {
            const userRef = doc(db, 'users', memberEmail);
            await updateDoc(userRef, { groupId: null });
        });

        await Promise.all(updates);

        // Delete the group document
        await deleteDoc(groupRef);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete group error", error);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}

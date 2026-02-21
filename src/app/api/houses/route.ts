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

        // 1. Check if user is already in a house
        const userCheckRef = doc(db, 'users', createdBy);
        const userSnap = await getDoc(userCheckRef);

        if (userSnap.exists() && userSnap.data().groupId) {
            return NextResponse.json({ error: 'User is already in a house' }, { status: 400 });
        }

        // 2. Create House Doc (Still in 'groups' collection for data persistence)
        const houseRef = await addDoc(collection(db, 'groups'), {
            name,
            createdBy,
            members: [createdBy], // Initialize with creator
            currency: currency || 'USD',
            createdAt: new Date().toISOString()
        });

        // 3. Update User Doc with houseId (stored as groupId in DB)
        const userRef = doc(db, 'users', createdBy);
        await setDoc(userRef, { groupId: houseRef.id }, { merge: true });

        return NextResponse.json({ id: houseRef.id, name, createdBy });
    } catch (error) {
        console.error('Error creating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const snapshot = await getDocs(collection(db, 'groups'));
        const houses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(houses);
    } catch (e) {
        return NextResponse.json([]);
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail } = body;

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'HouseId and UserEmail required' }, { status: 400 });
        }

        const houseRef = doc(db, 'groups', houseId);
        const houseSnap = await getDoc(houseRef);

        if (!houseSnap.exists()) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data();

        if (houseData.createdBy !== userEmail) {
            return NextResponse.json({ error: 'Only creator can delete' }, { status: 403 });
        }

        const updates = houseData.members.map(async (memberEmail: string) => {
            const userRef = doc(db, 'users', memberEmail);
            await updateDoc(userRef, { groupId: null });
        });

        await Promise.all(updates);
        await deleteDoc(houseRef);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete house error", error);
        return NextResponse.json({ error: 'Failed to delete house' }, { status: 500 });
    }
}

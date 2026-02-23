import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, deleteDoc, setDoc, query, where } from 'firebase/firestore';

async function deleteHouseAndAllData(houseId: string, members: string[]) {
    // 1. Clear groupId from all members
    const userUpdates = members.map(email =>
        updateDoc(doc(db, 'users', email), { groupId: null })
    );
    await Promise.all(userUpdates);

    // 2. Delete all expenses for this house
    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('houseId', '==', houseId)));
    await Promise.all(expensesSnap.docs.map(d => deleteDoc(d.ref)));

    // 3. Delete all shopping todos for this house
    const todosSnap = await getDocs(query(collection(db, 'shopping_todos'), where('houseId', '==', houseId)));
    await Promise.all(todosSnap.docs.map(d => deleteDoc(d.ref)));

    // 4. Delete all settlements for this house
    const settlementsSnap = await getDocs(query(collection(db, 'settlements'), where('houseId', '==', houseId)));
    await Promise.all(settlementsSnap.docs.map(d => deleteDoc(d.ref)));

    // 5. Delete the house doc
    await deleteDoc(doc(db, 'groups', houseId));
}

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
            return NextResponse.json({ error: 'Only creator can initiate deletion' }, { status: 403 });
        }

        const members: string[] = houseData.members || [];

        if (members.length <= 1) {
            // Only one member - delete immediately
            await deleteHouseAndAllData(houseId, members);
            return NextResponse.json({ success: true, deleted: true });
        } else {
            // Multiple members - create a pending deletion request
            await updateDoc(houseRef, {
                deletionRequest: {
                    initiatedBy: userEmail,
                    approvals: [],
                    createdAt: new Date().toISOString()
                }
            });
            return NextResponse.json({ success: true, deleted: false, pendingApproval: true });
        }
    } catch (error) {
        console.error("Delete house error", error);
        return NextResponse.json({ error: 'Failed to delete house' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

async function deleteHouseAndAllData(houseId: string, members: string[]) {
    const batch = adminDb.batch();

    // 1. Clear groupId from all members
    for (const email of members) {
        batch.update(adminDb.collection('users').doc(email), { groupId: null });
    }

    // 2. Delete all expenses for this house
    const expensesSnap = await adminDb.collection('expenses').where('houseId', '==', houseId).get();
    expensesSnap.docs.forEach(d => batch.delete(d.ref));

    // 3. Delete all shopping todos for this house
    const todosSnap = await adminDb.collection('shopping_todos').where('houseId', '==', houseId).get();
    todosSnap.docs.forEach(d => batch.delete(d.ref));

    // 4. Delete all settlements for this house
    const settlementsSnap = await adminDb.collection('settlements').where('houseId', '==', houseId).get();
    settlementsSnap.docs.forEach(d => batch.delete(d.ref));

    // 5. Delete the house doc
    batch.delete(adminDb.collection('groups').doc(houseId));

    await batch.commit();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, createdBy, currency } = body;

        if (!name || !createdBy) {
            return NextResponse.json({ error: 'Name and CreatedBy are required' }, { status: 400 });
        }

        // 1. Check if user is already in a house
        const userSnap = await adminDb.collection('users').doc(createdBy).get();
        if (userSnap.exists && userSnap.data()?.groupId) {
            return NextResponse.json({ error: 'User is already in a house' }, { status: 400 });
        }

        // 2. Create House Doc (Still in 'groups' collection for data persistence)
        const houseRef = await adminDb.collection('groups').add({
            name,
            createdBy,
            members: [createdBy],
            currency: currency || 'USD',
            createdAt: new Date().toISOString()
        });

        // 3. Update User Doc with houseId (stored as groupId in DB)
        await adminDb.collection('users').doc(createdBy).set({ groupId: houseRef.id }, { merge: true });

        return NextResponse.json({ id: houseRef.id, name, createdBy });
    } catch (error) {
        console.error('Error creating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const snapshot = await adminDb.collection('groups').get();
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

        const houseRef = adminDb.collection('groups').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        if (houseData.createdBy !== userEmail) {
            return NextResponse.json({ error: 'Only creator can initiate deletion' }, { status: 403 });
        }

        const members: string[] = houseData.members || [];

        if (members.length <= 1) {
            await deleteHouseAndAllData(houseId, members);
            return NextResponse.json({ success: true, deleted: true });
        } else {
            await houseRef.update({
                deletionRequest: {
                    initiatedBy: userEmail,
                    approvals: [],
                    createdAt: new Date().toISOString()
                }
            });
            return NextResponse.json({ success: true, deleted: false, pendingApproval: true });
        }
    } catch (error) {
        console.error('Delete house error', error);
        return NextResponse.json({ error: 'Failed to delete house' }, { status: 500 });
    }
}

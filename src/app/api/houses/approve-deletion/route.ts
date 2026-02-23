import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, getDocs, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

async function deleteHouseAndAllData(houseId: string, members: string[]) {
    // 1. Clear groupId from all members
    const userUpdates = members.map(email =>
        updateDoc(doc(db, 'users', email), { groupId: null })
    );
    await Promise.all(userUpdates);

    // 2. Delete all expenses for this house
    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('houseId', '==', houseId)));
    const expenseDeletes = expensesSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(expenseDeletes);

    // 3. Delete all shopping todos for this house
    const todosSnap = await getDocs(query(collection(db, 'shopping_todos'), where('houseId', '==', houseId)));
    const todoDeletes = todosSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(todoDeletes);

    // 4. Delete all settlements for this house
    const settlementsSnap = await getDocs(query(collection(db, 'settlements'), where('houseId', '==', houseId)));
    const settlementDeletes = settlementsSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(settlementDeletes);

    // 5. Delete the house doc
    await deleteDoc(doc(db, 'groups', houseId));
}

export async function POST(request: Request) {
    try {
        const { houseId, userEmail } = await request.json();

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'houseId and userEmail are required' }, { status: 400 });
        }

        const houseRef = doc(db, 'groups', houseId);
        const houseSnap = await getDoc(houseRef);

        if (!houseSnap.exists()) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data();
        const deletionRequest = houseData.deletionRequest;

        if (!deletionRequest) {
            return NextResponse.json({ error: 'No pending deletion request' }, { status: 400 });
        }

        // Add this user's approval
        const existingApprovals: string[] = deletionRequest.approvals || [];
        if (!existingApprovals.includes(userEmail)) {
            existingApprovals.push(userEmail);
        }

        // Check if all non-initiator members have approved
        const allMembers: string[] = houseData.members || [];
        const nonInitiators = allMembers.filter((m: string) => m !== deletionRequest.initiatedBy);
        const allApproved = nonInitiators.every((m: string) => existingApprovals.includes(m));

        if (allApproved) {
            // Delete the house and all related data
            await deleteHouseAndAllData(houseId, allMembers);
            return NextResponse.json({ success: true, deleted: true });
        } else {
            // Update approvals list
            await updateDoc(houseRef, {
                'deletionRequest.approvals': existingApprovals
            });
            return NextResponse.json({ success: true, deleted: false });
        }

    } catch (error) {
        console.error('Approve deletion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

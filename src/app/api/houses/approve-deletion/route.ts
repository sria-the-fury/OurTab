import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

async function deleteHouseAndAllData(houseId: string, members: string[]) {
    const batch = adminDb.batch();

    for (const email of members) {
        batch.update(adminDb.collection('users').doc(email), { groupId: null });
    }

    const expensesSnap = await adminDb.collection('expenses').where('houseId', '==', houseId).get();
    expensesSnap.docs.forEach(d => batch.delete(d.ref));

    const todosSnap = await adminDb.collection('shopping_todos').where('houseId', '==', houseId).get();
    todosSnap.docs.forEach(d => batch.delete(d.ref));

    const settlementsSnap = await adminDb.collection('settlements').where('houseId', '==', houseId).get();
    settlementsSnap.docs.forEach(d => batch.delete(d.ref));

    batch.delete(adminDb.collection('groups').doc(houseId));

    await batch.commit();
}

export async function POST(request: Request) {
    try {
        const { houseId, userEmail } = await request.json();

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'houseId and userEmail are required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const deletionRequest = houseData.deletionRequest;

        if (!deletionRequest) {
            return NextResponse.json({ error: 'No pending deletion request' }, { status: 400 });
        }

        const existingApprovals: string[] = deletionRequest.approvals || [];
        if (!existingApprovals.includes(userEmail)) {
            existingApprovals.push(userEmail);
        }

        const allMembers: string[] = houseData.members || [];
        const nonInitiators = allMembers.filter((m: string) => m !== deletionRequest.initiatedBy);
        const allApproved = nonInitiators.every((m: string) => existingApprovals.includes(m));

        if (allApproved) {
            await deleteHouseAndAllData(houseId, allMembers);
            return NextResponse.json({ success: true, deleted: true });
        } else {
            await houseRef.update({ 'deletionRequest.approvals': existingApprovals });
            return NextResponse.json({ success: true, deleted: false });
        }

    } catch (error) {
        console.error('Approve deletion error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

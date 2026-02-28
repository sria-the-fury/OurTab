import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail, userToApprove } = body;

        if (!houseId || !userEmail || !userToApprove) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const leaveRequests = houseData.leaveRequests || {};
        const leaveRequest = leaveRequests[userToApprove];

        if (!leaveRequest) {
            return NextResponse.json({ error: 'No leave request found for this user' }, { status: 400 });
        }

        const existingApprovals: string[] = leaveRequest.approvals || [];
        if (!existingApprovals.includes(userEmail)) {
            existingApprovals.push(userEmail);
        }

        const allMembers: string[] = houseData.members || [];
        const otherMembers = allMembers.filter(m => m !== userToApprove);
        const allApproved = otherMembers.every(m => existingApprovals.includes(m));

        if (allApproved) {
            const newMembers = allMembers.filter(m => m !== userToApprove);
            delete leaveRequests[userToApprove];

            const memberDetails = houseData.memberDetails || {};
            if (memberDetails[userToApprove]) {
                delete memberDetails[userToApprove];
            }

            const batch = adminDb.batch();
            batch.update(houseRef, { members: newMembers, leaveRequests, memberDetails });

            const userRef = adminDb.collection('users').doc(userToApprove);
            batch.update(userRef, { houseId: null });

            await batch.commit();

            // Notify fully approved
            try {
                // Fetch the departing user's name/photo
                const leaverSnap = await adminDb.collection('users').doc(userToApprove).get();
                const leaverName = leaverSnap.exists
                    ? (leaverSnap.data()?.name || userToApprove.split('@')[0])
                    : userToApprove.split('@')[0];
                const leaverPhotoUrl = leaverSnap.exists ? leaverSnap.data()?.photoUrl : undefined;

                await createNotification({
                    userId: userToApprove,
                    type: 'house',
                    message: `Your request to leave the house has been fully approved.`
                });
                const otherNots = newMembers.map((m: string) => createNotification({
                    userId: m,
                    type: 'house',
                    message: `has left the house.`,
                    senderName: leaverName,
                    senderPhotoUrl: leaverPhotoUrl
                }));
                await Promise.all(otherNots);
            } catch (e) { console.error('Error notif fully approved', e); }

            return NextResponse.json({ success: true, fullyApproved: true, left: true });
        } else {
            leaveRequests[userToApprove].approvals = existingApprovals;
            await houseRef.update({ leaveRequests });

            // Notify partial approval
            try {
                await createNotification({
                    userId: userToApprove,
                    type: 'house',
                    message: `${userEmail} approved your request to leave.`
                });
            } catch (e) { console.error('Error notif partial approval', e); }

            return NextResponse.json({ success: true, fullyApproved: false });
        }

    } catch (error) {
        console.error('Approve leave error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail, targetEmail, role, rentAmount } = body;

        if (!houseId || !userEmail || !targetEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const houseName = houseData.name || 'House';

        // Check if requester is a manager (or the creator for legacy houses)
        const isCreator = houseData.createdBy === userEmail;
        const isManager = houseData.memberDetails?.[userEmail]?.role === 'manager';

        if (!isCreator && !isManager) {
            return NextResponse.json({ error: 'Unauthorized. Only managers can update member settings.' }, { status: 403 });
        }

        // Only allow updating members that are currently in the house
        if (!houseData.members.includes(targetEmail)) {
            return NextResponse.json({ error: 'Target user is not a member of this house.' }, { status: 400 });
        }

        const memberDataToUpdate: any = {};
        if (role !== undefined) memberDataToUpdate.role = role;
        if (rentAmount !== undefined) memberDataToUpdate.rentAmount = Number(rentAmount);

        const updates: any = {
            memberDetails: {
                [targetEmail]: memberDataToUpdate
            }
        };

        // Rule: If a manager (without creator) promotes another member to manager,
        // they should lose their role as a manager and become a member again.
        let promoNotificationSent = false;
        if (role === 'manager' && !isCreator && isManager && targetEmail !== userEmail) {
            // Check if target is not already a manager
            const isTargetAlreadyManager = houseData.memberDetails?.[targetEmail]?.role === 'manager';
            if (!isTargetAlreadyManager) {
                // Demote requester
                updates.memberDetails[userEmail] = {
                    ...houseData.memberDetails?.[userEmail],
                    role: 'member'
                };
            }
        }

        if (Object.keys(memberDataToUpdate).length > 0 || updates.memberDetails[userEmail]) {
            await houseRef.set(updates, { merge: true });

            // Send notification if someone was made manager
            if (role === 'manager' && targetEmail !== userEmail) {
                const isTargetAlreadyManager = houseData.memberDetails?.[targetEmail]?.role === 'manager';
                if (!isTargetAlreadyManager) {
                    // Fetch requester's info for the notification
                    const userSnap = await adminDb.collection('users').doc(userEmail).get();
                    const userData = userSnap.exists ? userSnap.data() : null;
                    const senderName = userData?.name || userEmail.split('@')[0];
                    const senderPhotoUrl = userData?.photoUrl || '';

                    await createNotification({
                        userId: targetEmail,
                        type: 'house',
                        message: `${senderName} has made you ${houseName}'s Manager.`,
                        relatedId: houseId,
                        senderName,
                        senderPhotoUrl
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating member settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

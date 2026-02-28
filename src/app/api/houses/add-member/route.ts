import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, houseId, addedBy } = body;

        if (!email || !houseId) {
            return NextResponse.json({ error: 'Email and HouseId are required' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(email);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found. Ask them to sign up first.' }, { status: 404 });
        }

        const userData = userSnap.data()!;
        if (userData.houseId || userData.groupId) {
            return NextResponse.json({ error: 'User is already in a house.' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();
        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found.' }, { status: 404 });
        }
        const houseData = houseSnap.data()!;

        await houseRef.set({
            members: FieldValue.arrayUnion(email),
            memberDetails: {
                [email]: {
                    role: 'member',
                    rentAmount: 0
                }
            }
        }, { merge: true });

        await userRef.update({ houseId: houseId });

        // Notify the user who was added and existing members
        try {
            let senderName = 'System';
            let senderPhotoUrl = '';
            if (addedBy) {
                const addedBySnap = await adminDb.collection('users').doc(addedBy).get();
                if (addedBySnap.exists) {
                    senderName = addedBySnap.data()?.name || addedBy.split('@')[0];
                    senderPhotoUrl = addedBySnap.data()?.photoUrl || '';
                }
            }

            const newMemberName = userData.name || email.split('@')[0];

            // 1. Notify the new member
            await createNotification({
                userId: email,
                type: 'house',
                message: `added you to ${houseData.name || 'the house'}.`,
                senderName,
                senderPhotoUrl
            });

            // 2. Notify ALL existing members (except the inviter)
            const existingMembers = houseData.members || [];
            const notifications = existingMembers
                .filter((m: string) => m !== addedBy)
                .map((m: string) =>
                    createNotification({
                        userId: m,
                        type: 'house',
                        message: `has added ${newMemberName} as a new member.`,
                        senderName,
                        senderPhotoUrl
                    })
                );
            await Promise.all(notifications);

        } catch (notifErr) { console.error('Error sending added-to-house notifications:', notifErr); }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

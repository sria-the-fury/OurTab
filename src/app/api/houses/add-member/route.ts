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

        await houseRef.update({
            members: FieldValue.arrayUnion(email),
            [`memberDetails.${email}`]: {
                role: 'member',
                rentAmount: 0
            }
        });

        await userRef.update({ houseId: houseId });

        // Notify the user who was added
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

            await createNotification({
                userId: email,
                type: 'house',
                message: `has added you to the house: ${houseData.name || 'grocery house'}.`,
                senderName,
                senderPhotoUrl
            });
        } catch (notifErr) { console.error('Error sending added-to-house notification:', notifErr); }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

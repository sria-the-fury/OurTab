import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { houseId, email } = body;
        if (!houseId || !email) {
            return NextResponse.json({ error: 'HouseId and Email are required' }, { status: 400 });
        }
        email = email.toLowerCase();

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();
        const houseData = houseSnap.data()!;

        // Robust member lookup helper
        const getMemberDetail = (email: string) => {
            let detail = houseData.memberDetails?.[email];
            if (!detail && email.includes('.')) {
                const parts = email.split('.');
                let current = houseData.memberDetails;
                for (const part of parts) { current = current?.[part]; }
                if (current && typeof current === 'object' && ('role' in current || 'rentAmount' in current)) {
                    detail = current;
                }
            }
            return detail;
        };

        const myDetails = getMemberDetail(email);
        const { FieldPath } = require('firebase-admin/firestore');
        const isNested = (obj: any, email: string) => email.includes('.') && !!obj?.[email.split('.')[0]];

        const batch = adminDb.batch();

        // 1. Delete nested versions if they exist
        if (isNested(houseData.memberDetails, email)) {
            batch.update(houseRef, { [new FieldPath('memberDetails', ...email.split('.'))]: FieldValue.delete() });
        }
        if (isNested(houseData.mealOffRequests, email)) {
            batch.update(houseRef, { [new FieldPath('mealOffRequests', ...email.split('.'))]: FieldValue.delete() });
        }

        // 2. Set flat literal versions
        batch.set(houseRef, {
            memberDetails: {
                [email]: {
                    ...myDetails,
                    mealsEnabled: true,
                    offFromDate: FieldValue.delete()
                }
            },
            // Also clear literal request key
            mealOffRequests: {
                [email]: FieldValue.delete()
            }
        }, { merge: true });

        await batch.commit();

        // Notify managers that user is back on
        try {
            const houseSnap = await houseRef.get();
            const houseData = houseSnap.data()!;
            const userSnap = await adminDb.collection('users').doc(email).get();
            const userName = userSnap.exists ? (userSnap.data()?.name || email.split('@')[0]) : email.split('@')[0];
            const userPhotoUrl = userSnap.exists ? userSnap.data()?.photoUrl : undefined;

            const members = houseData.members || [];
            const memberDetails = houseData.memberDetails || {};

            const managers = members.filter((m: string) => {
                const normalizedM = m.toLowerCase();
                return normalizedM !== email &&
                    (memberDetails[m]?.role === 'manager' || houseData.createdBy?.toLowerCase() === normalizedM);
            });

            const notifications = managers.map((m: string) =>
                createNotification({
                    userId: m,
                    type: 'house',
                    message: `has turned his meals back ON.`,
                    senderName: userName,
                    senderPhotoUrl: userPhotoUrl
                })
            );
            await Promise.all(notifications);
        } catch (err) {
            console.error('Error notifying managers of meal on:', err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error turning meal on:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

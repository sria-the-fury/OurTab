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

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        // Robust member lookup helper
        const getMemberDetail = (email: string) => {
            let detail = houseData.memberDetails?.[email];
            if (!detail && email.includes('.')) {
                // Check for nested dots version
                const parts = email.split('.');
                let current = houseData.memberDetails;
                for (const part of parts) {
                    current = current?.[part];
                }
                if (current && typeof current === 'object' && ('role' in current || 'rentAmount' in current)) {
                    detail = current;
                }
            }
            return detail;
        };

        const myDetails = getMemberDetail(email);
        const isManager = (myDetails?.role === 'manager') || (houseData.createdBy === email);

        const { FieldPath } = require('firebase-admin/firestore');

        // Helper to check if nested data exists
        const isNested = (obj: any, email: string) => email.includes('.') && !!obj?.[email.split('.')[0]];

        if (isManager) {
            // Auto-approve for manager
            const now = new Date();
            const windowEnd = houseData.mealUpdateWindowEnd || '05:00';
            const [endHour, endMin] = windowEnd.split(':').map(Number);
            const todayEnd = new Date(now);
            todayEnd.setHours(endHour, endMin, 0, 0);

            let offFromDate: string;
            if (now <= todayEnd) {
                offFromDate = now.toISOString().split('T')[0];
            } else {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                offFromDate = tomorrow.toISOString().split('T')[0];
            }

            // Perform updates and aggressive healing in one batch
            const batch = adminDb.batch();

            // 1. Delete nested versions if they exist
            if (isNested(houseData.memberDetails, email)) {
                batch.update(houseRef, { [new FieldPath('memberDetails', ...email.split('.'))]: FieldValue.delete() });
            }
            if (isNested(houseData.mealOffRequests, email)) {
                batch.update(houseRef, { [new FieldPath('mealOffRequests', ...email.split('.'))]: FieldValue.delete() });
            }

            // 2. Set flat literal version
            batch.set(houseRef, {
                memberDetails: {
                    [email]: {
                        ...myDetails,
                        mealsEnabled: false,
                        offFromDate: offFromDate
                    }
                },
                // Also clear literal request key just in case
                mealOffRequests: {
                    [email]: FieldValue.delete()
                }
            }, { merge: true });

            await batch.commit();
            // Silent return for managers - no notification needed for self
            return NextResponse.json({ success: true, autoApproved: true, offFromDate });
        }

        // Idempotency check for regular members
        const currentReq = houseData.mealOffRequests?.[email];
        if (currentReq && currentReq.status === 'pending') {
            return NextResponse.json({ success: true, message: 'Request already pending' });
        }

        // Update the mealOffRequests map for regular members
        const batch = adminDb.batch();
        if (isNested(houseData.mealOffRequests, email)) {
            batch.update(houseRef, { [new FieldPath('mealOffRequests', ...email.split('.'))]: FieldValue.delete() });
        }

        batch.set(houseRef, {
            mealOffRequests: {
                [email]: {
                    requestedAt: new Date().toISOString(),
                    status: 'pending'
                }
            }
        }, { merge: true });

        await batch.commit();

        // Notify managers
        try {
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
                    message: `${userName} has requested to turn off his meals. Please review in Profile settings.`,
                    senderName: userName,
                    senderPhotoUrl: userPhotoUrl
                })
            );
            await Promise.all(notifications);
        } catch (err) {
            console.error('Error notifying managers of meal off request:', err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error requesting meal off:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

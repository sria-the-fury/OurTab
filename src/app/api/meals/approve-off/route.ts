import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { houseId, email, managerEmail } = body;
        if (!houseId || !email || !managerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        email = email.toLowerCase();
        managerEmail = managerEmail.toLowerCase();

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
        const managerDetails = getMemberDetail(managerEmail);
        const isManager = (managerDetails?.role === 'manager') || (houseData.createdBy?.toLowerCase() === managerEmail);

        if (!isManager) {
            return NextResponse.json({ error: 'Unauthorized. Only managers can approve requests.' }, { status: 403 });
        }

        // Idempotency check: If meals are already disabled and no pending request exists, 
        // it might have been auto-approved or already handled.
        if (myDetails?.mealsEnabled === false && (!houseData.mealOffRequests || !houseData.mealOffRequests[email])) {
            return NextResponse.json({ success: true, message: 'Already approved' });
        }

        // Calculate offFromDate
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

        const dateObj = new Date(offFromDate);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = dateObj.toLocaleString('en-GB', { month: 'short' });
        const year = dateObj.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;

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
                    mealsEnabled: false,
                    offFromDate: offFromDate
                }
            },
            // Also clear literal request key
            mealOffRequests: {
                [email]: FieldValue.delete()
            }
        }, { merge: true });

        await batch.commit();

        // Notify user
        try {
            const managerSnap = await adminDb.collection('users').doc(managerEmail).get();
            const managerName = managerSnap.exists ? (managerSnap.data()?.name || managerEmail.split('@')[0]) : managerEmail.split('@')[0];
            const managerPhotoUrl = managerSnap.exists ? managerSnap.data()?.photoUrl : undefined;

            await createNotification({
                userId: email,
                type: 'house',
                message: `has approved your request to turn off meals. Meals will stop from ${formattedDate}.`,
                senderName: managerName,
                senderPhotoUrl: managerPhotoUrl
            });
        } catch (err) {
            console.error('Error notifying user of approval:', err);
        }

        return NextResponse.json({ success: true, offFromDate });
    } catch (error) {
        console.error('Error approving meal off:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

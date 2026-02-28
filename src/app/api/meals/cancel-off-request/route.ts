import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { houseId, email } = body;
        if (!houseId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        email = email.toLowerCase();

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();
        const houseData = houseSnap.data()!;

        const { FieldPath } = require('firebase-admin/firestore');
        const isNested = (obj: any, email: string) => email.includes('.') && !!obj?.[email.split('.')[0]];

        const batch = adminDb.batch();

        // 1. Delete nested version if it exists
        if (isNested(houseData.mealOffRequests, email)) {
            batch.update(houseRef, { [new FieldPath('mealOffRequests', ...email.split('.'))]: FieldValue.delete() });
        }

        // 2. Delete flat version
        batch.set(houseRef, {
            mealOffRequests: {
                [email]: FieldValue.delete()
            }
        }, { merge: true });

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error canceling meal off request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

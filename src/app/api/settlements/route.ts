import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, month, year, settlements } = body;

        if (!houseId || month === undefined || year === undefined || !settlements) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const settlementId = `${houseId}_${year}_${month}`;

        const settlementData = {
            houseId,
            month,
            year,
            settlements,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await adminDb.collection('settlements').doc(settlementId).set(settlementData);

        return NextResponse.json({ id: settlementId, ...settlementData });
    } catch (error) {
        console.error('Error creating/updating settlement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    try {
        if (!houseId) {
            return NextResponse.json({ error: 'houseId is required' }, { status: 400 });
        }

        if (month !== null && year !== null) {
            const settlementId = `${houseId}_${year}_${month}`;
            const snap = await adminDb.collection('settlements').doc(settlementId).get();

            if (!snap.exists) {
                return NextResponse.json(null);
            }
            return NextResponse.json({ id: snap.id, ...snap.data() });
        } else {
            const snapshot = await adminDb.collection('settlements')
                .where('houseId', '==', houseId)
                .get();
            const settlements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(settlements);
        }
    } catch (error) {
        console.error('Error fetching settlements:', error);
        return NextResponse.json({ error: 'Error fetching settlements' }, { status: 500 });
    }
}

export async function PATCH() {
    return NextResponse.json({ error: 'Use POST to update settlements' }, { status: 400 });
}

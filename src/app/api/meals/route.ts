import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, date, email, mealType, isTaking } = body;

        if (!houseId || !date || !email || !mealType || isTaking === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // The document ID is a combination of houseId and date, e.g., "house123_2023-10-27"
        const docId = `${houseId}_${date}`;
        const mealRef = adminDb.collection('mealStatuses').doc(docId);

        // Update the specific meal type for the specific user
        await mealRef.set({
            houseId,
            date,
            meals: {
                [email]: {
                    [mealType]: isTaking
                }
            },
            updatedAt: new Date().toISOString()
        }, { merge: true }); // Merge true is crucial to avoid overwriting other users' meals

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating meal status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!houseId) {
        return NextResponse.json({ error: 'House ID is required' }, { status: 400 });
    }

    try {
        let query = adminDb.collection('mealStatuses').where('houseId', '==', houseId);

        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }

        const snap = await query.get();

        const statuses = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(statuses);
    } catch (error) {
        console.error('Error fetching meal statuses:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

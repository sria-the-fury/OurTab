import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, month, year, settlements } = body;

        if (!houseId || month === undefined || year === undefined || !settlements) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create a unique ID for this month's settlement
        const settlementId = `${houseId}_${year}_${month}`;

        const settlementData = {
            houseId,
            month,
            year,
            settlements,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Use setDoc to create or update
        await setDoc(doc(db, 'settlements', settlementId), settlementData);

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
        const settlementsRef = collection(db, 'settlements');
        let q;

        if (houseId && month !== null && year !== null) {
            // Get specific month
            const settlementId = `${houseId}_${year}_${month}`;
            const docRef = doc(db, 'settlements', settlementId);
            const snapshot = await getDocs(query(settlementsRef, where('__name__', '==', settlementId)));

            if (snapshot.empty) {
                return NextResponse.json(null);
            }

            const settlement = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            return NextResponse.json(settlement);
        } else if (houseId) {
            // Get all settlements for house
            q = query(settlementsRef, where('houseId', '==', houseId));
            const snapshot = await getDocs(q);
            const settlements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(settlements);
        } else {
            return NextResponse.json({ error: 'houseId is required' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching settlements:', error);
        return NextResponse.json({ error: 'Error fetching settlements' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { settlementId, settlementIndex, paid } = body;

        if (!settlementId || settlementIndex === undefined || paid === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const settlementRef = doc(db, 'settlements', settlementId);

        // This is a simplified approach - in production you'd want to fetch, update array item, then save
        // For now, we'll handle this via client-side logic and full update via POST

        return NextResponse.json({ error: 'Use POST to update settlements' }, { status: 400 });
    } catch (error) {
        console.error('Error updating settlement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

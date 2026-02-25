import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

    try {
        const userSnap = await adminDb.collection('users').doc(email).get();
        if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const houseId = userSnap.data()?.houseId || userSnap.data()?.groupId;

        const expensesSnap = await adminDb.collection('expenses').where('houseId', '==', houseId).get();
        const expenses = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(expenses);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

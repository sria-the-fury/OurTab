import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// POST: Cancel a pending payment — removes it entirely
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, paymentId, cancellerEmail } = body;

        if (!houseId || !paymentId || !cancellerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const paymentRef = adminDb
            .collection('houses')
            .doc(houseId)
            .collection('pendingPayments')
            .doc(paymentId);

        const paymentSnap = await paymentRef.get();

        if (!paymentSnap.exists) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const payment = paymentSnap.data()!;

        // Only the sender can cancel it
        if (payment.from !== cancellerEmail) {
            return NextResponse.json({ error: 'Only the sender can cancel a payment request' }, { status: 403 });
        }

        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'Payment is not pending' }, { status: 400 });
        }

        // Delete the payment document
        await paymentRef.delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error cancelling payment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

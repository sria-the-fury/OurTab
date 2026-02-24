import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// POST: Cancel a pending payment — removes it entirely
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, paymentId, cancellerEmail } = body;

        if (!houseId || !paymentId || !cancellerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const pendingPayments: any[] = houseData.pendingPayments || [];

        const paymentIndex = pendingPayments.findIndex((p: any) => p.id === paymentId);
        if (paymentIndex === -1) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const payment = pendingPayments[paymentIndex];

        // Only the sender can cancel it
        if (payment.from !== cancellerEmail) {
            return NextResponse.json({ error: 'Only the sender can cancel a payment request' }, { status: 403 });
        }

        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'Payment is not pending' }, { status: 400 });
        }

        // Remove the pending payment entirely
        const updatedPayments = pendingPayments.filter((p: any) => p.id !== paymentId);

        // Update the house with the removed payment
        await houseRef.update({
            pendingPayments: updatedPayments,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error cancelling payment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

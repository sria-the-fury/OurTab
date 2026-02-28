import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';
import { getCurrencySymbol } from '@/utils/currency';

// POST: Create a payment request (payer → receiver)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, fromEmail, toEmail, amount, method } = body;

        if (!houseId || !fromEmail || !toEmail || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        const paymentsRef = adminDb
            .collection('houses')
            .doc(houseId)
            .collection('pendingPayments');

        // Check for duplicate pending request
        const existingSnap = await paymentsRef
            .where('from', '==', fromEmail)
            .where('to', '==', toEmail)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            return NextResponse.json({ error: 'A pending payment request already exists' }, { status: 409 });
        }

        const newPaymentRef = paymentsRef.doc();
        const newPayment = {
            id: newPaymentRef.id,
            from: fromEmail,
            to: toEmail,
            amount: Number(amount),
            method: method || 'bank',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        await newPaymentRef.set(newPayment);

        // Notify the receiver
        try {
            const houseSnap = await adminDb.collection('houses').doc(houseId).get();
            const houseData = houseSnap.data();
            const currencySymbol = getCurrencySymbol(houseData?.currency);

            const senderSnap = await adminDb.collection('users').doc(fromEmail).get();
            const senderName = senderSnap.exists ? (senderSnap.data()?.name || fromEmail.split('@')[0]) : fromEmail.split('@')[0];
            const senderPhotoUrl = senderSnap.exists ? senderSnap.data()?.photoUrl : undefined;

            const actionText = method === 'cash' ? 'Please check and approve.' : 'Please check your Bank account and approve.';
            const message = `has sent you ${currencySymbol}${amount}. ${actionText}`;

            await createNotification({
                userId: toEmail,
                type: 'settlement',
                message,
                relatedId: newPayment.id,
                senderName,
                senderPhotoUrl
            });
        } catch (e) { console.error('Error notifying request payment', e); }

        return NextResponse.json({ success: true, payment: newPayment });
    } catch (error: Error | unknown) {
        console.error('Error creating payment request:', error);

        if (error instanceof Error) {
            if (error.message === 'House not found') {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            if (error.message === 'A pending payment request already exists') {
                return NextResponse.json({ error: error.message }, { status: 409 });
            }
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

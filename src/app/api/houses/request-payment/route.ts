import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

// POST: Create a payment request (payer → receiver)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, fromEmail, toEmail, amount, method } = body;

        if (!houseId || !fromEmail || !toEmail || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);

        const newPayment = {
            id: `${fromEmail}_${toEmail}_${Date.now()}`,
            from: fromEmail,
            to: toEmail,
            amount: Number(amount),
            method: method || 'bank',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        await adminDb.runTransaction(async (transaction) => {
            const houseSnap = await transaction.get(houseRef);

            if (!houseSnap.exists) {
                throw new Error('House not found');
            }

            const houseData = houseSnap.data()!;
            const pendingPayments: { from: string; to: string; status: string }[] = houseData.pendingPayments || [];

            // Check for duplicate pending request inside transaction
            const alreadyExists = pendingPayments.some(
                (p: { from: string; to: string; status: string }) => p.from === fromEmail && p.to === toEmail && p.status === 'pending'
            );
            if (alreadyExists) {
                throw new Error('A pending payment request already exists');
            }

            transaction.update(houseRef, {
                pendingPayments: [...pendingPayments, newPayment],
            });
        });

        // Notify the receiver
        try {
            // Fetch sender's profile info
            const senderSnap = await adminDb.collection('users').doc(fromEmail).get();
            const senderName = senderSnap.exists ? (senderSnap.data()?.name || fromEmail.split('@')[0]) : fromEmail.split('@')[0];
            const senderPhotoUrl = senderSnap.exists ? senderSnap.data()?.photoUrl : undefined;

            const actionText = method === 'cash' ? 'Please check and approve.' : 'Please check your Bank account and approve.';
            const message = `has sent you $${amount}. ${actionText}`;

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

        // Handle specific transaction errors to yield correct status codes
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

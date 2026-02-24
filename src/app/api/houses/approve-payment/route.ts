import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

interface PendingPayment {
    id: string;
    from: string;
    to: string;
    amount: number;
    method?: string;
    status: string;
    createdAt?: unknown;
    approvedAt?: string;
}

// POST: Approve a pending payment — records it as a settled expense
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, paymentId, approverEmail } = body;

        if (!houseId || !paymentId || !approverEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const pendingPayments: PendingPayment[] = houseData.pendingPayments || [];

        const paymentIndex = pendingPayments.findIndex((p: PendingPayment) => p.id === paymentId);
        if (paymentIndex === -1) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const payment = pendingPayments[paymentIndex];

        // Only the receiver can approve
        if (payment.to !== approverEmail) {
            return NextResponse.json({ error: 'Only the receiver can approve a payment' }, { status: 403 });
        }

        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'Payment is not pending' }, { status: 400 });
        }

        // Mark payment as approved
        const updatedPayments = [...pendingPayments];
        updatedPayments[paymentIndex] = { ...payment, status: 'approved', approvedAt: new Date().toISOString() };

        // Record as a real expense:
        // Payer (payment.from) paid the full amount. The only person who "benefits" from this split is the receiver (payment.to).
        // By splitting only between the two, the receiver's debt drops by the amount, and the payer's balance increases correctly.
        // We record it as: payer paid, only payer+receiver are split (i.e. it's a transfer).
        // Actually simplest: we create a "settlement" expense where the contributor is the payer and we mark it as a payment.
        const approvedAt = new Date().toISOString();
        // payment.createdAt may be a Firestore Timestamp or an ISO string
        const rawSentAt = payment.createdAt;
        const sentAt = rawSentAt
            ? (typeof rawSentAt === 'string' ? rawSentAt : (rawSentAt as { toDate?: () => { toISOString?: () => string } }).toDate?.()?.toISOString?.() || approvedAt)
            : null;
        console.log('[approve-payment] sentAt:', sentAt, '| approvedAt:', approvedAt);
        await adminDb.collection('expenses').add({
            description: `Settlement payment`,
            amount: payment.amount,
            userId: payment.from,
            groupId: houseId,
            date: approvedAt,
            isSettlementPayment: true,
            method: payment.method || 'bank',
            settlementBetween: [payment.from, payment.to],
            contributors: [{ email: payment.from, amount: payment.amount }],
            createdAt: sentAt || approvedAt,
            approvedAt: approvedAt,
        });

        // REMOVE the payment from pendingPayments entirely — it has been recorded as an
        // expense above, so there's no need to keep it in the house document.
        // Keeping it (even as 'approved') causes the document to grow unboundedly.
        const remainingPayments = pendingPayments.filter((_: PendingPayment, i: number) => i !== paymentIndex);
        await houseRef.update({
            pendingPayments: remainingPayments,
        });

        // Notify the sender
        try {
            const approverSnap = await adminDb.collection('users').doc(approverEmail).get();
            const approverName = approverSnap.exists ? (approverSnap.data()?.name || approverEmail.split('@')[0]) : approverEmail.split('@')[0];
            const approverPhotoUrl = approverSnap.exists ? approverSnap.data()?.photoUrl : undefined;

            await createNotification({
                userId: payment.from,
                type: 'settlement',
                message: `approved your payment of $${payment.amount}.`,
                relatedId: payment.id,
                senderName: approverName,
                senderPhotoUrl: approverPhotoUrl
            });
        } catch (e) { console.error('Error notifying payment approval', e); }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error approving payment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

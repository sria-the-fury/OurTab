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

        const paymentRef = adminDb
            .collection('groups')
            .doc(houseId)
            .collection('pendingPayments')
            .doc(paymentId);

        const paymentSnap = await paymentRef.get();

        if (!paymentSnap.exists) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const payment = paymentSnap.data() as PendingPayment;

        // Only the receiver can approve
        if (payment.to !== approverEmail) {
            return NextResponse.json({ error: 'Only the receiver can approve a payment' }, { status: 403 });
        }

        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'Payment is not pending' }, { status: 400 });
        }

        const approvedAt = new Date().toISOString();

        // payment.createdAt may be a Firestore Timestamp or an ISO string
        const rawSentAt = payment.createdAt;
        const sentAt = rawSentAt
            ? (typeof rawSentAt === 'string' ? rawSentAt : (rawSentAt as { toDate?: () => { toISOString?: () => string } }).toDate?.()?.toISOString?.() || approvedAt)
            : null;

        // Record as a settled expense
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

        // Delete the payment from the subcollection — it's now safely recorded as an expense
        await paymentRef.delete();

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

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// POST: Create a payment request (payer → receiver)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, fromEmail, toEmail, amount, method } = body;

        if (!houseId || !fromEmail || !toEmail || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('groups').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const pendingPayments: { from: string; to: string; status: string }[] = houseData.pendingPayments || [];

        // Check for duplicate pending request
        const alreadyExists = pendingPayments.some(
            (p: { from: string; to: string; status: string }) => p.from === fromEmail && p.to === toEmail && p.status === 'pending'
        );
        if (alreadyExists) {
            return NextResponse.json({ error: 'A pending payment request already exists' }, { status: 409 });
        }

        const newPayment = {
            id: `${fromEmail}_${toEmail}_${Date.now()}`,
            from: fromEmail,
            to: toEmail,
            amount: Number(amount),
            method: method || 'bank',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        await houseRef.update({
            pendingPayments: [...pendingPayments, newPayment],
        });

        return NextResponse.json({ success: true, payment: newPayment });
    } catch (error) {
        console.error('Error creating payment request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

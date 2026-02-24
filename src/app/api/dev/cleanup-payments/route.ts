import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// One-time cleanup: Remove all 'approved' payments from the pendingPayments array in the house document.
// Approved payments have already been recorded as proper expenses, so keeping them here is wasteful and will cause the doc to grow.
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const housesSnap = await adminDb.collection('groups').get();
        let totalCleaned = 0;

        for (const houseDoc of housesSnap.docs) {
            const houseData = houseDoc.data();
            const pendingPayments: { status: string }[] = houseData.pendingPayments || [];

            const approvedCount = pendingPayments.filter(p => p.status === 'approved').length;

            if (approvedCount > 0) {
                const remainingPayments = pendingPayments.filter(p => p.status !== 'approved');
                await houseDoc.ref.update({ pendingPayments: remainingPayments });
                totalCleaned += approvedCount;
                console.log(`[cleanup] Removed ${approvedCount} approved payments from house ${houseDoc.id}`);
            }
        }

        return NextResponse.json({ success: true, removedCount: totalCleaned, message: `Removed ${totalCleaned} stale approved payments from house documents.` });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

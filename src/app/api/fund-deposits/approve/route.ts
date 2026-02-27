import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { depositId, action, managerEmail } = body;

        if (!depositId || !action || !managerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 });
        }

        const depositRef = adminDb.collection('fundDeposits').doc(depositId);
        const depositSnap = await depositRef.get();

        if (!depositSnap.exists) {
            return NextResponse.json({ error: 'Deposit request not found' }, { status: 404 });
        }

        const depositData = depositSnap.data()!;

        if (depositData.status !== 'pending') {
            return NextResponse.json({ error: 'Deposit is already processed' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(depositData.houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;
        const isManager = houseData.memberDetails?.[managerEmail]?.role === 'manager' || houseData.createdBy === managerEmail;

        if (!isManager) {
            return NextResponse.json({ error: 'Unauthorized. Only managers can approve deposits.' }, { status: 403 });
        }

        // Get manager info for notification
        const managerSnap = await adminDb.collection('users').doc(managerEmail).get();
        const managerName = managerSnap.exists ? (managerSnap.data()?.name || managerEmail.split('@')[0]) : managerEmail.split('@')[0];
        const managerPhotoUrl = managerSnap.exists ? managerSnap.data()?.photoUrl : undefined;

        const currencySymbol = houseData.currency === 'EUR' ? '€' : (houseData.currency === 'GBP' ? '£' : '$');

        if (action === 'reject') {
            // Notify rejection before deleting
            try {
                await createNotification({
                    userId: depositData.userId,
                    type: 'house',
                    message: `has rejected your fund deposit request of ${currencySymbol}${depositData.amount}.`,
                    senderName: managerName,
                    senderPhotoUrl: managerPhotoUrl
                });
            } catch (notifErr) { console.error('Error sending rejection notification:', notifErr); }

            // Delete the document entirely on rejection
            await depositRef.delete();
            return NextResponse.json({ success: true, status: 'rejected' });
        }

        await depositRef.update({
            status: 'approved',
            approvedBy: managerEmail,
            approvedAt: new Date().toISOString()
        });

        // Notify approval
        try {
            await createNotification({
                userId: depositData.userId,
                type: 'house',
                message: `has approved your fund deposit request of ${currencySymbol}${depositData.amount}.`,
                senderName: managerName,
                senderPhotoUrl: managerPhotoUrl
            });
        } catch (notifErr) { console.error('Error sending approval notification:', notifErr); }

        return NextResponse.json({ success: true, status: 'approved' });
    } catch (error) {
        console.error('Error processing fund deposit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


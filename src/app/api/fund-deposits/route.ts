import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';
import { getCurrencySymbol } from '@/utils/currency';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { houseId, email, amount } = body;

        if (!houseId || !email || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        // Check if the submitting user is a manager — if so, auto-approve
        const memberDetails = houseData.memberDetails || {};
        const isManager = memberDetails[email]?.role === 'manager' || houseData.createdBy === email;

        const newDeposit = {
            houseId,
            email,
            amount: Number(amount),
            date: new Date().toISOString().split('T')[0],
            status: isManager ? 'approved' : 'pending',
            createdAt: new Date().toISOString(),
            ...(isManager ? { approvedBy: email, approvedAt: new Date().toISOString() } : {})
        };

        const docRef = await adminDb.collection('fundDeposits').add(newDeposit);

        // Only notify other managers if the deposit is pending (i.e., submitter is not a manager)
        if (!isManager) {
            try {
                let finalSenderName = email.split('@')[0];
                let finalSenderPhotoUrl = '';

                try {
                    const userSnap = await adminDb.collection('users').doc(email).get();
                    if (userSnap.exists) {
                        const userData = userSnap.data();
                        if (userData?.name) finalSenderName = userData.name;
                        if (userData?.photoUrl) finalSenderPhotoUrl = userData.photoUrl;
                    }
                } catch (err) {
                    console.error('Error fetching user for deposit notification:', err);
                }

                const members = houseData.members || [];
                const allMemberDetails = houseData.memberDetails || {};

                const managersToNotify = members
                    .map((m: any) => typeof m === 'string' ? m : m.email)
                    .filter((mEmail: string) => mEmail !== email && (allMemberDetails[mEmail]?.role === 'manager' || houseData.createdBy === mEmail));

                if (managersToNotify.length > 0) {
                    const currencySymbol = getCurrencySymbol(houseData?.currency);
                    const notifications = managersToNotify.map((mEmail: string) =>
                        createNotification({
                            userId: mEmail,
                            type: 'settlement',
                            message: `requested to deposit ${currencySymbol}${Number(amount).toFixed(2)} to the house fund.`,
                            senderName: finalSenderName,
                            senderPhotoUrl: finalSenderPhotoUrl,
                            relatedId: docRef.id
                        })
                    );
                    await Promise.all(notifications);
                }
            } catch (notifErr) {
                console.error('Error sending deposit notifications:', notifErr);
            }
        }

        return NextResponse.json({ id: docRef.id, ...newDeposit });
    } catch (error: any) {
        console.error('Error submitting fund deposit:', error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error', stack: error?.stack }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');

    if (!houseId) {
        return NextResponse.json({ error: 'House ID is required' }, { status: 400 });
    }

    try {
        const depositsSnap = await adminDb.collection('fundDeposits')
            .where('houseId', '==', houseId)
            .get();

        const deposits = depositsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort in-app by createdAt descending (avoids needing a composite Firestore index)
        deposits.sort((a: any, b: any) =>
            (b.createdAt || '').localeCompare(a.createdAt || '')
        );

        return NextResponse.json(deposits);
    } catch (error: any) {
        console.error('Error fetching fund deposits:', error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}

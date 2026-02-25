import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        // 1. Get User to find houseId
        const userSnap = await adminDb.collection('users').doc(email).get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const resolvedHouseId = userData.houseId || userData.groupId; // support old field during migration
        if (!resolvedHouseId) {
            return NextResponse.json(null); // No house
        }

        const houseRef = adminDb.collection('houses').doc(resolvedHouseId);

        // 2. Fetch house data, members, and pendingPayments subcollection in parallel
        const [houseSnap, , pendingPaymentsSnap] = await Promise.all([
            houseRef.get(),
            Promise.resolve(null),
            houseRef.collection('pendingPayments').get(),
        ]);

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        // 3. Fetch details for all members
        const memberPromises = houseData.members.map(async (memberEmail: string) => {
            const memberSnap = await adminDb.collection('users').doc(memberEmail).get();
            return memberSnap.exists ? { email: memberEmail, ...memberSnap.data() } : { email: memberEmail };
        });

        const members = await Promise.all(memberPromises);

        // 4. Map pendingPayments from subcollection
        const pendingPayments = pendingPaymentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Remove the old array field from houseData if it exists, replace with subcollection data
        const { pendingPayments: _oldArray, ...restHouseData } = houseData;
        void _oldArray; // suppress unused variable warning

        return NextResponse.json({
            id: houseSnap.id,
            ...restHouseData,
            members,
            pendingPayments,
        });

    } catch (error) {
        console.error('Error fetching house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

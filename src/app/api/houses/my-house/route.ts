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
            const baseData = memberSnap.exists ? { email: memberEmail, ...(memberSnap.data() as object) } : { email: memberEmail };

            // Inject memberDetails (role, rentAmount) from house document if it exists
            let additionalDetails = houseData.memberDetails?.[memberEmail];

            // --- HEALING MECHANISM ---
            // If the key is missing but the email has a dot, Firestore might have nested it.
            // e.g. memberDetails: { "user@gmail": { "com": { role: 'member', rentAmount: 0 } } }
            if (!additionalDetails && memberEmail.includes('.')) {
                const parts = memberEmail.split('.');
                let current = houseData.memberDetails;
                for (const part of parts) {
                    current = current?.[part];
                }
                if (current && typeof current === 'object' && ('role' in current || 'rentAmount' in current)) {
                    additionalDetails = current;
                    // Proactively "heal" the document in background (don't await)
                    adminDb.collection('houses').doc(resolvedHouseId).set({
                        memberDetails: {
                            [memberEmail]: current
                        }
                    }, { merge: true }).catch(e => console.error(`[healing] Failed to fix ${memberEmail} in ${resolvedHouseId}`, e));
                }
            }
            // --------------------------

            return { ...baseData, ...(additionalDetails || {}) };
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

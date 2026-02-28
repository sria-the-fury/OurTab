import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Developer utility to fix corrupted memberDetails keys caused by dots in emails.
 * Firestore normally interprets dots in update() keys as nested objects.
 * This script flattens those nested objects back into the top-level memberDetails map.
 */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const housesSnap = await adminDb.collection('houses').get();
        let housesFixed = 0;
        let detailsFixed = 0;

        const results: any[] = [];

        for (const houseDoc of housesSnap.docs) {
            const houseData = houseDoc.data();
            const members: string[] = houseData.members || [];
            const memberDetails = houseData.memberDetails || {};
            let needsFix = false;
            const updatedDetails = { ...memberDetails };

            for (const email of members) {
                if (!email.includes('.')) continue;

                // Check if the email already exists as a literal key
                if (updatedDetails[email]) continue;

                // Try to find the nested value
                const parts = email.split('.');
                let current = memberDetails;
                let found = true;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part];
                    } else {
                        found = false;
                        break;
                    }
                }

                if (found && current && typeof current === 'object' && ('role' in current || 'rentAmount' in current)) {
                    // Found corrupted nested entry! Move it to the top level.
                    updatedDetails[email] = current;
                    needsFix = true;
                    detailsFixed++;

                    // We don't delete the nested path here because it might be tricky with FieldPath,
                    // but providing the full map in set({memberDetails: ...}, {merge: true}) 
                    // won't necessarily remove the nested garbage. 
                    // However, it will ensure the LITERAL key exists and is used by the app.
                }
            }

            if (needsFix) {
                await houseDoc.ref.set({ memberDetails: updatedDetails }, { merge: true });
                housesFixed++;
                results.push({ id: houseDoc.id, name: houseData.name });
            }
        }

        return NextResponse.json({
            success: true,
            housesFixed,
            detailsFixed,
            results,
            message: `Fixed ${detailsFixed} corrupted member entries across ${housesFixed} houses.`
        });
    } catch (error) {
        console.error('Repair error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

async function deleteHouseAndAllData(houseId: string, members: string[]) {
    const batch = adminDb.batch();

    // 1. Clear houseId from all members
    for (const email of members) {
        batch.update(adminDb.collection('users').doc(email), { houseId: null });
    }

    // 2. Delete all expenses for this house
    const expensesSnap = await adminDb.collection('expenses').where('houseId', '==', houseId).get();
    expensesSnap.docs.forEach(d => batch.delete(d.ref));

    // 3. Delete all shopping todos for this house
    const todosSnap = await adminDb.collection('shopping_todos').where('houseId', '==', houseId).get();
    todosSnap.docs.forEach(d => batch.delete(d.ref));

    // 4. Delete all settlements for this house
    const settlementsSnap = await adminDb.collection('settlements').where('houseId', '==', houseId).get();
    settlementsSnap.docs.forEach(d => batch.delete(d.ref));

    // 5. Delete the house doc
    batch.delete(adminDb.collection('houses').doc(houseId));

    await batch.commit();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, createdBy, currency, typeOfHouse, mealsPerDay } = body;

        if (!name || !createdBy) {
            return NextResponse.json({ error: 'Name and CreatedBy are required' }, { status: 400 });
        }

        // 1. Check if user is already in a house
        const userSnap = await adminDb.collection('users').doc(createdBy).get();
        if (userSnap.exists && userSnap.data()?.houseId) {
            return NextResponse.json({ error: 'User is already in a house' }, { status: 400 });
        }

        // 2. Create House Doc in 'houses' collection
        const houseData: any = {
            name,
            createdBy,
            members: [createdBy], // Keeping array of emails for backward compatibility and fast querying
            memberDetails: { // Adding detailed map of members
                [createdBy]: {
                    role: 'manager',
                    rentAmount: 0 // Default rent is 0
                }
            },
            currency: currency || 'USD',
            typeOfHouse: typeOfHouse || 'expenses',
            createdAt: new Date().toISOString()
        };

        if (typeOfHouse === 'meals_and_expenses') {
            houseData.mealsPerDay = mealsPerDay || 3;
        }

        const houseRef = await adminDb.collection('houses').add(houseData);

        // 3. Update User Doc with houseId
        await adminDb.collection('users').doc(createdBy).set({ houseId: houseRef.id }, { merge: true });

        return NextResponse.json({ id: houseRef.id, name, createdBy });
    } catch (error) {
        console.error('Error creating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const snapshot = await adminDb.collection('houses').get();
        const houses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(houses);
    } catch {
        return NextResponse.json([]);
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { houseId, userEmail } = body;

        if (!houseId || !userEmail) {
            return NextResponse.json({ error: 'HouseId and UserEmail required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();

        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        const members: string[] = houseData.members || [];

        if (members.length <= 1) {
            await deleteHouseAndAllData(houseId, members);
            return NextResponse.json({ success: true, deleted: true });
        } else {
            await houseRef.update({
                deletionRequest: {
                    initiatedBy: userEmail,
                    approvals: [],
                    createdAt: new Date().toISOString()
                }
            });

            // Notify all other members
            try {
                const userSnap = await adminDb.collection('users').doc(userEmail).get();
                const userName = userSnap.exists ? (userSnap.data()?.name || userEmail.split('@')[0]) : userEmail.split('@')[0];
                const userPhotoUrl = userSnap.exists ? userSnap.data()?.photoUrl : undefined;
                const houseName = houseData.name || 'the house';

                const notifications = members
                    .filter((m: string) => m !== userEmail)
                    .map((m: string) =>
                        createNotification({
                            userId: m,
                            type: 'house',
                            message: `has initiated to delete ${houseName}. Please approve carefully or all data will be lost.`,
                            senderName: userName,
                            senderPhotoUrl: userPhotoUrl,
                            actionType: 'approve_deletion',
                            metadata: { houseId }
                        })
                    );
                await Promise.all(notifications);
            } catch (err) { console.error('Error notifying delete request', err); }

            return NextResponse.json({ success: true, deleted: false, pendingApproval: true });
        }
    } catch (error) {
        console.error('Delete house error', error);
        return NextResponse.json({ error: 'Failed to delete house' }, { status: 500 });
    }
}

function formatTime(timeStr: string) {
    return timeStr; // Return raw HH:mm string to be formatted by the frontend
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { houseId, updatedBy, ...updates } = body;

        if (!houseId) {
            return NextResponse.json({ error: 'houseId is required' }, { status: 400 });
        }

        const houseRef = adminDb.collection('houses').doc(houseId);
        const houseSnap = await houseRef.get();
        if (!houseSnap.exists) {
            return NextResponse.json({ error: 'House not found' }, { status: 404 });
        }

        const houseData = houseSnap.data()!;

        // 1. Check if updater is manager or creator
        if (!updatedBy) {
            return NextResponse.json({ error: 'updatedBy (user email) is required' }, { status: 400 });
        }

        const memberDetail = houseData.memberDetails?.[updatedBy];
        const isManager = memberDetail?.role === 'manager';
        const isCreator = houseData.createdBy === updatedBy;

        if (!isManager && !isCreator) {
            return NextResponse.json({ error: 'Only managers can update house settings' }, { status: 403 });
        }

        // Whitelist allowed update fields
        const allowedFields = ['mealUpdateWindowStart', 'mealUpdateWindowEnd', 'mealsPerDay', 'currency', 'name'];
        const safeUpdates: Record<string, any> = {};
        for (const key of allowedFields) {
            if (key in updates) safeUpdates[key] = updates[key];
        }

        if (Object.keys(safeUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        await houseRef.update(safeUpdates);

        // Notify members if meal window changed
        if (updatedBy && (safeUpdates.mealUpdateWindowStart || safeUpdates.mealUpdateWindowEnd)) {
            try {
                const userSnap = await adminDb.collection('users').doc(updatedBy).get();
                const userName = userSnap.exists ? (userSnap.data()?.name || updatedBy.split('@')[0]) : updatedBy.split('@')[0];
                const userPhotoUrl = userSnap.exists ? userSnap.data()?.photoUrl : undefined;

                const start = safeUpdates.mealUpdateWindowStart || houseData.mealUpdateWindowStart || '20:00';
                const end = safeUpdates.mealUpdateWindowEnd || houseData.mealUpdateWindowEnd || '05:00';

                const members: string[] = houseData.members || [];
                const notifications = members.map((m: string) =>
                    createNotification({
                        userId: m,
                        type: 'house',
                        message: `${userName} has been updated the meal window time ${formatTime(start)} to ${formatTime(end)}. You can updated your upcoming meals between in this time.`,
                        senderName: userName,
                        senderPhotoUrl: userPhotoUrl
                    })
                );
                await Promise.all(notifications);
            } catch (err) {
                console.error('Error sending meal window notifications:', err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating house:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

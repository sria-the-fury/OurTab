import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');

    if (!houseId) {
        return NextResponse.json({ error: 'Missing houseId' }, { status: 400 });
    }

    try {
        const snapshot = await adminDb.collection('shopping_todos')
            .where('houseId', '==', houseId)
            .get();

        let todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as { id: string; isCompleted?: boolean; completedAt?: string; createdAt: string;[key: string]: unknown }[];

        // --- Auto-deletion logic (12 hours) ---
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

        const toDeleteIds: string[] = [];
        const filteredTodos = todos.filter(todo => {
            if (todo.isCompleted && todo.completedAt && new Date(todo.completedAt) < twelveHoursAgo) {
                toDeleteIds.push(todo.id);
                return false;
            }
            return true;
        });

        if (toDeleteIds.length > 0) {
            const batch = adminDb.batch();
            for (const id of toDeleteIds) {
                batch.delete(adminDb.collection('shopping_todos').doc(id));
            }
            await batch.commit();
            console.log(`Auto-deleted ${toDeleteIds.length} old todos`);
            todos = filteredTodos;
        }

        // Sort in memory to avoid index requirement
        todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(todos);
    } catch (error) {
        console.error('Error fetching shopping todos:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items, houseId, addedBy } = body; // Changed itemName to items

        if (!items || !Array.isArray(items) || items.length === 0 || !houseId || !addedBy) {
            return NextResponse.json({ error: 'Missing required fields or items is not an array' }, { status: 400 });
        }

        const batch = adminDb.batch();
        const addedTodos = [];

        for (const itemName of items) {
            const todoData = {
                itemName: itemName.trim(),
                houseId,
                addedBy,
                isCompleted: false,
                createdAt: new Date().toISOString()
            };
            const docRef = adminDb.collection('shopping_todos').doc();
            batch.set(docRef, todoData);
            addedTodos.push({ id: docRef.id, ...todoData });
        }

        await batch.commit();

        // Notify other house members (once for the whole batch)
        try {
            const houseSnap = await adminDb.collection('houses').doc(houseId).get();
            const houseData = houseSnap.data();

            console.log('--- DEBUG NOTIFICATIONS ---');
            console.log('addedBy:', addedBy);
            console.log('houseData.members:', JSON.stringify(houseData?.members));

            // Assuming members is an array of strings (emails)
            const isStringArray = houseData?.members?.length > 0 && typeof houseData?.members[0] === 'string';

            let finalSenderName = addedBy.split('@')[0];
            let finalSenderPhotoUrl = '';

            // Try to fetch the full sender profile from the users collection
            try {
                const userSnap = await adminDb.collection('users').doc(addedBy).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    if (userData?.name) finalSenderName = userData.name;
                    if (userData?.photoUrl) finalSenderPhotoUrl = userData.photoUrl;
                }
            } catch (userErr) {
                console.error('Error fetching sender profile:', userErr);
            }

            if (houseData && Array.isArray(houseData.members)) {
                if (isStringArray) {
                    const membersToNotify = houseData.members.filter((memberEmail: string) => memberEmail !== addedBy);
                    console.log('membersToNotify (strings):', membersToNotify);

                    const notifications = membersToNotify
                        .map((memberEmail: string) =>
                            createNotification({
                                userId: memberEmail,
                                type: 'shopping',
                                message: `has been added items for buy.`,
                                senderName: finalSenderName,
                                senderPhotoUrl: finalSenderPhotoUrl,
                                // relatedId: docRef.id // Omitted for batch, clicking goes to list
                            })
                        );
                    await Promise.all(notifications);
                    console.log('Notifications sent successfully (strings)');
                } else {
                    const sender = houseData.members.find((m: any) => m.email === addedBy) || {};
                    finalSenderName = sender.name || addedBy.split('@')[0];
                    finalSenderPhotoUrl = sender.photoUrl || '';

                    const membersToNotify = houseData.members.filter((member: any) => member.email !== addedBy);
                    console.log('membersToNotify (objects):', JSON.stringify(membersToNotify));

                    const notifications = membersToNotify
                        .map((member: any) =>
                            createNotification({
                                userId: member.email,
                                type: 'shopping',
                                message: `has been added items for buy.`,
                                senderName: finalSenderName,
                                senderPhotoUrl: finalSenderPhotoUrl,
                                // relatedId: docRef.id // Omitted for batch, clicking goes to list
                            })
                        );
                    await Promise.all(notifications);
                    console.log('Notifications sent successfully (objects)');
                }
            }
        } catch (notifError) {
            console.error('Error sending shopping notifications:', notifError);
        }

        return NextResponse.json({ success: true, addedTodos });
    } catch (error) {
        console.error('Error creating shopping todo batch:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, isCompleted, expenseId, completedBy } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const todoRef = adminDb.collection('shopping_todos').doc(id);
        const todoSnap = await todoRef.get();

        if (!todoSnap.exists) {
            return NextResponse.json({ error: 'To-do not found' }, { status: 404 });
        }

        const currentData = todoSnap.data()!;

        // --- Unmarking Logic ---
        if (currentData.isCompleted && isCompleted === false) {
            // Rule: Allow unmarking within 5 minutes if manually marked
            const now = new Date();
            const completedAt = new Date(currentData.completedAt || 0);
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            if (currentData.completedBy === 'auto') {
                return NextResponse.json({ error: 'Auto-marked items cannot be unmarked' }, { status: 400 });
            }
            if (completedAt < fiveMinutesAgo) {
                return NextResponse.json({ error: 'Items can only be unmarked within 5 minutes of completion' }, { status: 400 });
            }

            // Allow unmarking
            await todoRef.update({
                isCompleted: false,
                completedAt: null,
                completedBy: null
            });
            return NextResponse.json({ success: true, isCompleted: false });
        }

        const updates: { isCompleted: boolean; completedAt?: string | null; completedBy?: string | null; expenseId?: string } = { isCompleted };
        if (isCompleted && !currentData.isCompleted) {
            updates.completedAt = new Date().toISOString();
            if (completedBy) updates.completedBy = completedBy;
        }
        if (expenseId) updates.expenseId = expenseId;

        await todoRef.update(updates);
        return NextResponse.json({ success: true, ...updates });
    } catch (error) {
        console.error('Error updating shopping todo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    try {
        const todoRef = adminDb.collection('shopping_todos').doc(id);
        const todoSnap = await todoRef.get();

        if (todoSnap.exists) {
            const todoData = todoSnap.data()!;

            // Rule: Auto-marked items (they auto-delete in 12 hours)
            if (todoData.isCompleted && todoData.completedBy === 'auto') {
                return NextResponse.json({
                    error: 'Auto-marked items cannot be deleted manually. They will be removed automatically after 12 hours.'
                }, { status: 400 });
            }

            // --- DELETION RULES ---
            const now = new Date();
            const completedAt = todoData.completedAt ? new Date(todoData.completedAt) : null;
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

            if (!todoData.isCompleted) {
                // Rule: Active item can be deleted ONLY by the person who added it
                // We'd ideally check the requesting user's email, but for now we trust the client or expect it in params if auth is handled differently.
                // Since this API uses doc ID directly, we'll assume the client-side check is the primary guard but we can add a check if we had user info.
            } else {
                // Rule: Manual mark can be deleted within 10 min
                if (completedAt && completedAt < tenMinutesAgo) {
                    return NextResponse.json({ error: 'Completed items can only be deleted within 10 minutes' }, { status: 400 });
                }
            }
        }

        await todoRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shopping todo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

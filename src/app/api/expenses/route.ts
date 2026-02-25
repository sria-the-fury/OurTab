import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, description, userId, houseId, contributors } = body;

        if (!amount || !description || !userId || !houseId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const totalAmount = parseFloat(amount);

        if (contributors && Array.isArray(contributors)) {
            const contributorTotal = contributors.reduce((sum: number, c: { email: string; amount?: number | string }) => sum + parseFloat(String(c.amount ?? 0)), 0);
            if (contributorTotal > totalAmount) {
                return NextResponse.json({ error: 'Total contributor amounts cannot exceed expense amount' }, { status: 400 });
            }
            const validContributors = contributors.every((c: { email?: string; amount?: unknown }) => c.email && c.amount !== undefined);
            if (!validContributors) {
                return NextResponse.json({ error: 'Each contributor must have email and amount' }, { status: 400 });
            }
        }

        const expenseData: {
            amount: number;
            description: string;
            userId: string;
            houseId: string;
            date: string;
            contributors?: { email: string; amount: number }[];
        } = {
            amount: totalAmount,
            description,
            userId,
            houseId,
            date: new Date().toISOString()
        };

        if (contributors && contributors.length > 0) {
            expenseData.contributors = contributors.map((c: { email: string; amount: number | string }) => ({
                email: c.email,
                amount: parseFloat(String(c.amount))
            }));
        }

        const expenseRef = await adminDb.collection('expenses').add(expenseData);

        // --- Notify other house members ---
        try {
            const houseSnap = await adminDb.collection('houses').doc(houseId).get();
            const houseData = houseSnap.data();

            // Find the sender (current user) to get their info
            // Since members array might just be strings (emails), let's ensure we handle both cases
            // We might need to fetch user info from the 'users' collection or rely on the senderName logic
            // Assuming members is an array of strings (emails)
            let finalSenderName = userId.split('@')[0];
            let finalSenderPhotoUrl = ''; // We don't have photo URL if it's just strings. We'd have to query the 'users' collection.

            // Try to fetch the full sender profile from the users collection
            try {
                const userSnap = await adminDb.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    if (userData?.name) finalSenderName = userData.name;
                    if (userData?.photoUrl) finalSenderPhotoUrl = userData.photoUrl;
                }
            } catch (userErr) {
                console.error('Error fetching sender profile:', userErr);
            }

            if (houseData && Array.isArray(houseData.members)) {
                // If the array contains strings:
                const isStringArray = houseData.members.length > 0 && typeof houseData.members[0] === 'string';

                if (isStringArray) {
                    const notifications = houseData.members
                        .filter((memberEmail: string) => memberEmail !== userId)
                        .map((memberEmail: string) =>
                            createNotification({
                                userId: memberEmail,
                                type: 'expense',
                                message: `has made an expense of $${totalAmount.toFixed(2)}.`,
                                senderName: finalSenderName,
                                senderPhotoUrl: finalSenderPhotoUrl,
                                relatedId: expenseRef.id
                            })
                        );
                    await Promise.all(notifications);
                } else {
                    // If the array contains objects (as previously assumed)
                    const sender = houseData.members.find((m: any) => m.email === userId) || {};
                    const objectSenderName = sender.name || finalSenderName;
                    const objectSenderPhotoUrl = sender.photoUrl || finalSenderPhotoUrl;

                    const notifications = houseData.members
                        .filter((member: any) => member.email !== userId)
                        .map((member: any) =>
                            createNotification({
                                userId: member.email,
                                type: 'expense',
                                message: `has made an expense of $${totalAmount.toFixed(2)}.`,
                                senderName: objectSenderName,
                                senderPhotoUrl: objectSenderPhotoUrl,
                                relatedId: expenseRef.id
                            })
                        );
                    await Promise.all(notifications);
                }
            }
        } catch (notifError) {
            console.error('Error sending expense notifications:', notifError);
        }

        // --- Auto-mark Shopping To-Dos ---
        try {
            const todosSnap = await adminDb.collection('shopping_todos')
                .where('houseId', '==', houseId)
                .where('isCompleted', '==', false)
                .get();

            const batch = adminDb.batch();
            let batchCount = 0;
            for (const todoDoc of todosSnap.docs) {
                const todo = todoDoc.data();
                if (description.toLowerCase().includes(todo.itemName.toLowerCase())) {
                    batch.update(todoDoc.ref, {
                        isCompleted: true,
                        completedBy: 'auto',
                        expenseId: expenseRef.id,
                        completedAt: new Date().toISOString()
                    });
                    batchCount++;
                }
            }
            if (batchCount > 0) {
                await batch.commit();
                console.log(`Auto-marked ${batchCount} todos for expense ${expenseRef.id}`);
            }
        } catch (todoError) {
            console.error('Error auto-marking todos:', todoError);
        }

        return NextResponse.json({ id: expenseRef.id, ...expenseData });
    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');
    const userId = searchParams.get('userId');

    try {
        let query = adminDb.collection('expenses') as FirebaseFirestore.Query;

        if (houseId) {
            query = query.where('houseId', '==', houseId);
        } else if (userId) {
            query = query.where('userId', '==', userId);
        }

        const snapshot = await query.get();
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json({ error: 'Error fetching' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
        }

        const expenseRef = adminDb.collection('expenses').doc(id);
        const expenseSnap = await expenseRef.get();

        if (!expenseSnap.exists) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const expenseData = expenseSnap.data()!;

        if (expenseData.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const createdDate = new Date(expenseData.date);
        const now = new Date();
        const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours > 48) {
            return NextResponse.json({ error: 'Cannot delete expense older than 48 hours' }, { status: 403 });
        }

        await expenseRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, userId, amount, description } = body;

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
        }

        const expenseRef = adminDb.collection('expenses').doc(id);
        const expenseSnap = await expenseRef.get();

        if (!expenseSnap.exists) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const expenseData = expenseSnap.data()!;

        if (expenseData.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const createdDate = new Date(expenseData.date);
        const now = new Date();
        const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours > 48) {
            return NextResponse.json({ error: 'Cannot edit expense older than 48 hours' }, { status: 403 });
        }

        const updates: { amount?: number; description?: string } = {};
        if (amount) updates.amount = parseFloat(amount);
        if (description) updates.description = description;

        await expenseRef.update(updates);
        return NextResponse.json({ success: true, ...updates });
    } catch (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

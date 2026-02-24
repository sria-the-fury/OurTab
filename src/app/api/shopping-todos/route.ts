import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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

        let todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

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
        const { itemName, houseId, addedBy } = body;

        if (!itemName || !houseId || !addedBy) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const todoData = {
            itemName: itemName.trim(),
            houseId,
            addedBy,
            isCompleted: false,
            createdAt: new Date().toISOString()
        };

        const docRef = await adminDb.collection('shopping_todos').add(todoData);
        return NextResponse.json({ id: docRef.id, ...todoData });
    } catch (error) {
        console.error('Error creating shopping todo:', error);
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
        if (currentData.isCompleted && isCompleted === false) {
            return NextResponse.json({ error: 'Completed items cannot be unmarked' }, { status: 400 });
        }

        const updates: any = { isCompleted };
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
            // Block deletion only for auto-marked items (they auto-delete in 12 hours)
            if (todoData.isCompleted && todoData.completedBy === 'auto') {
                return NextResponse.json({
                    error: 'Auto-marked items cannot be deleted manually. They will be removed automatically after 12 hours.'
                }, { status: 400 });
            }
        }

        await todoRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shopping todo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

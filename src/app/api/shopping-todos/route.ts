import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');

    if (!houseId) {
        return NextResponse.json({ error: 'Missing houseId' }, { status: 400 });
    }

    try {
        const todosRef = collection(db, 'shopping_todos');
        const q = query(
            todosRef,
            where("houseId", "==", houseId)
        );

        const snapshot = await getDocs(q);
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
            const batch = [];
            for (const id of toDeleteIds) {
                batch.push(deleteDoc(doc(db, 'shopping_todos', id)));
            }
            await Promise.all(batch);
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

        const docRef = await addDoc(collection(db, 'shopping_todos'), todoData);
        return NextResponse.json({ id: docRef.id, ...todoData });
    } catch (error) {
        console.error('Error creating shopping todo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, isCompleted, expenseId } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const todoRef = doc(db, 'shopping_todos', id);

        // Fetch current state to prevent unmarking
        const todoSnap = await getDocs(query(collection(db, 'shopping_todos'), where("__name__", "==", id)));
        if (todoSnap.empty) {
            return NextResponse.json({ error: 'To-do not found' }, { status: 404 });
        }
        const currentData = todoSnap.docs[0].data();
        if (currentData.isCompleted && isCompleted === false) {
            return NextResponse.json({ error: 'Completed items cannot be unmarked' }, { status: 400 });
        }

        const updates: any = { isCompleted };
        if (isCompleted && !currentData.isCompleted) {
            updates.completedAt = new Date().toISOString();
        }
        if (expenseId) updates.expenseId = expenseId;

        await updateDoc(todoRef, updates);
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
        const todoRef = doc(db, 'shopping_todos', id);
        const todoSnap = await getDocs(query(collection(db, 'shopping_todos'), where("__name__", "==", id)));

        if (!todoSnap.empty) {
            const todoData = todoSnap.docs[0].data();
            if (todoData.isCompleted) {
                return NextResponse.json({ error: 'Completed items cannot be deleted manually. They will be removed automatically after 12 hours.' }, { status: 400 });
            }
        }

        await deleteDoc(todoRef);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shopping todo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

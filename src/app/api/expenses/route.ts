import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, description, userId, houseId, contributors } = body;

        // TODO: Verify Types. Amount should be number.
        if (!amount || !description || !userId || !houseId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const totalAmount = parseFloat(amount);

        // Validate contributors if provided
        if (contributors && Array.isArray(contributors)) {
            // Validate contributor amounts
            const contributorTotal = contributors.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

            if (contributorTotal > totalAmount) {
                return NextResponse.json({
                    error: 'Total contributor amounts cannot exceed expense amount'
                }, { status: 400 });
            }

            // Validate all contributors have email and amount
            const validContributors = contributors.every((c: any) => c.email && c.amount !== undefined);
            if (!validContributors) {
                return NextResponse.json({
                    error: 'Each contributor must have email and amount'
                }, { status: 400 });
            }
        }

        const expenseData: any = {
            amount: totalAmount,
            description,
            userId,
            groupId: houseId, // Still stored as groupId in Firestore
            date: new Date().toISOString()
        };

        // Add contributors if provided
        if (contributors && contributors.length > 0) {
            expenseData.contributors = contributors.map((c: any) => ({
                email: c.email,
                amount: parseFloat(c.amount)
            }));
        }

        const expenseRef = await addDoc(collection(db, 'expenses'), expenseData);

        // --- Auto-mark Shopping To-Dos ---
        try {
            const todosRef = collection(db, 'shopping_todos');
            const q = query(todosRef, where("houseId", "==", houseId), where("isCompleted", "==", false));
            const todosSnap = await getDocs(q);

            const batch = [];
            for (const doc of todosSnap.docs) {
                const todo = doc.data();
                // Match description (case insensitive check)
                if (description.toLowerCase().includes(todo.itemName.toLowerCase())) {
                    batch.push(updateDoc(doc.ref, {
                        isCompleted: true,
                        expenseId: expenseRef.id,
                        completedAt: new Date().toISOString()
                    }));
                }
            }
            if (batch.length > 0) {
                await Promise.all(batch);
                console.log(`Auto-marked ${batch.length} todos for expense ${expenseRef.id}`);
            }
        } catch (todoError) {
            console.error('Error auto-marking todos:', todoError);
            // Don't fail the whole request if auto-marking fails
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
        const expensesRef = collection(db, 'expenses');
        // Construct query
        let q;
        if (houseId) {
            q = query(expensesRef, where("groupId", "==", houseId)); //, orderBy("date", "desc") needs index
        } else if (userId) {
            q = query(expensesRef, where("userId", "==", userId));
        } else {
            q = query(expensesRef); // Get All
        }

        const snapshot = await getDocs(q);
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

        const expenseRef = doc(db, 'expenses', id);
        const expenseSnap = await getDoc(expenseRef);

        if (!expenseSnap.exists()) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const expenseData = expenseSnap.data();

        // 1. Verify ownership
        if (expenseData.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Verify time constraints (48 hours)
        const createdDate = new Date(expenseData.date);
        const now = new Date();
        const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours > 48) {
            return NextResponse.json({ error: 'Cannot delete expense older than 48 hours' }, { status: 403 });
        }

        await deleteDoc(expenseRef);

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

        const expenseRef = doc(db, 'expenses', id);
        const expenseSnap = await getDoc(expenseRef);

        if (!expenseSnap.exists()) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const expenseData = expenseSnap.data();

        // 1. Verify ownership
        if (expenseData.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Verify time constraints
        const createdDate = new Date(expenseData.date);
        const now = new Date();
        const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours > 48) {
            return NextResponse.json({ error: 'Cannot edit expense older than 48 hours' }, { status: 403 });
        }

        const updates: any = {};
        if (amount) updates.amount = parseFloat(amount);
        if (description) updates.description = description;

        await updateDoc(expenseRef, updates);

        return NextResponse.json({ success: true, ...updates });
    } catch (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

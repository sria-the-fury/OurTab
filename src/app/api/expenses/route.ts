import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, description, userId, groupId } = body;

        // TODO: Verify Types. Amount should be number.
        if (!amount || !description || !userId || !groupId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const expenseData = {
            amount: parseFloat(amount),
            description,
            userId,
            groupId,
            date: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'expenses'), expenseData);

        return NextResponse.json({ id: docRef.id, ...expenseData });
    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    try {
        const expensesRef = collection(db, 'expenses');
        // Construct query
        let q;
        if (groupId) {
            q = query(expensesRef, where("groupId", "==", groupId)); //, orderBy("date", "desc") needs index
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

// Create or Update User
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name, photoUrl, currency } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Use email as Doc ID for simplicity and uniqueness
        const userRef = doc(db, 'users', email);

        // Check if exists to preserve groupId if passing only basic info
        const userSnap = await getDoc(userRef);
        let userData: { email: any; name?: any; photoUrl?: any; currency?: any } = { email };

        // Only set fields if they're not undefined
        if (name !== undefined) userData.name = name;
        if (photoUrl !== undefined) userData.photoUrl = photoUrl;
        if (currency) userData.currency = currency;

        if (userSnap.exists()) {
            const existing = userSnap.data();
            userData = { ...existing, ...userData }; // Merge updates
        }

        await setDoc(userRef, userData, { merge: true });

        return NextResponse.json({ id: email, ...userData });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Get all users (Optional)
export async function GET(request: Request) {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => doc.data());
        return NextResponse.json(users);
    } catch (e) {
        return NextResponse.json([]);
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Create or Update User
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name, photoUrl, profession, whatsapp, messenger, birthday, iban } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(email);
        const userSnap = await userRef.get();

        interface UserRecord {
            email: string;
            name?: string;
            photoUrl?: string;
            profession?: string;
            whatsapp?: string;
            messenger?: string;
            birthday?: string;
            iban?: string;
        }

        let userData: UserRecord = { email };

        if (name !== undefined) userData.name = name;
        if (photoUrl !== undefined) userData.photoUrl = photoUrl;
        if (profession !== undefined) userData.profession = profession;
        if (whatsapp !== undefined) userData.whatsapp = whatsapp;
        if (messenger !== undefined) userData.messenger = messenger;
        if (iban !== undefined) userData.iban = iban;
        // Removed bkash, nagad, upay
        if (birthday !== undefined) userData.birthday = birthday; // Added birthday

        if (userSnap.exists) {
            const existing = userSnap.data()!;
            userData = { ...existing, ...userData };
        }

        await userRef.set(userData, { merge: true });

        return NextResponse.json({ id: email, ...userData });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Get all users or single user
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    try {
        if (email) {
            const userSnap = await adminDb.collection('users').doc(email).get();
            if (userSnap.exists) {
                return NextResponse.json({ id: userSnap.id, ...userSnap.data() });
            } else {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
        } else {
            const snapshot = await adminDb.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(users);
        }
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

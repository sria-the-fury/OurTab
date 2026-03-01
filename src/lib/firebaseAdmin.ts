import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS || '{}');
    admin.initializeApp({
        credential: admin.credential.cert(creds),
    });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminMessaging = admin.messaging();

export { adminDb, adminAuth, adminMessaging };

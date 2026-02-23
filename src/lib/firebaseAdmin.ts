import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;

    if (credentialsJson) {
        // Use JSON service account credentials from environment variable
        const credentials = JSON.parse(credentialsJson);
        return initializeApp({
            credential: cert(credentials),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }

    // Fallback: use Application Default Credentials (e.g. when running on GCP / with gcloud auth)
    return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

export const adminDb = getFirestore(getAdminApp());

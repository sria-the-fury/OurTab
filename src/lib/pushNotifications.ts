import { adminDb, adminMessaging } from './firebaseAdmin';

export async function sendPushNotification(email: string, title: string, body: string, data?: any) {
    try {
        const userDoc = await adminDb.collection('users').doc(email).get();
        if (!userDoc.exists) {
            console.log(`User ${email} not found for push notification`);
            return;
        }

        const userData = userDoc.data();
        const fcmToken = userData?.fcmToken;

        if (!fcmToken) {
            console.log(`User ${email} has no FCM token`);
            return;
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token: fcmToken,
        };

        const response = await adminMessaging.send(message);
        console.log('Successfully sent push notification:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

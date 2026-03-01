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

        const message: any = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token: fcmToken,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                    icon: 'stock_ticker_update',
                    color: '#6C63FF'
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true,
                        mutableContent: true,
                    },
                },
            },
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: '/'
                }
            }
        };

        const response = await adminMessaging.send(message);
        console.log('Successfully sent push notification:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

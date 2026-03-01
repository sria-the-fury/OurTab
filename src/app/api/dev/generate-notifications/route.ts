import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'jakariamsria@gmail.com'; // Default to user's email based on screenshots
    const senderName = searchParams.get('senderName') || 'Nur Ullah Mehmud';
    const senderPhotoUrl = 'https://lh3.googleusercontent.com/a/ACg8ocKwIvwQx9uUj_Z8k7o7s7aG3X5R8MmvwMI=s96-c'; // Stub photo

    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const batch = adminDb.batch();

        // Let's create one of each type of notification
        const notifications = [
            {
                userId,
                type: 'expense' as const,
                message: `has made an expense of $45.50.`,
                senderName,
                senderPhotoUrl,
                relatedId: 'test_expense_1'
            },
            {
                userId,
                type: 'shopping' as const,
                message: `has been added items for buy.`,
                senderName,
                senderPhotoUrl,
            },
            {
                userId,
                type: 'settlement' as const,
                message: `approved your payment of $120.00.`,
                senderName,
                senderPhotoUrl,
                relatedId: 'test_settlement_1'
            },
            {
                userId,
                type: 'house' as const,
                message: `wants to leave. Please check any remaining settlement and approve.`,
                senderName,
                senderPhotoUrl,
            }
        ];

        for (const notif of notifications) {
            await createNotification(notif);
        }

        return NextResponse.json({ success: true, count: notifications.length, message: `Generated ${notifications.length} notifications for ${userId}` });
    } catch (error) {
        console.error('Error generating notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

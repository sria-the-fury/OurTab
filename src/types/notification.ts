export type NotificationType = 'expense' | 'settlement' | 'shopping' | 'house' | 'birthday' | 'expense_todo';

export interface AppNotification {
    id?: string;
    userId: string;
    type: NotificationType;
    message: string;
    read: boolean;
    createdAt: string;
    relatedId?: string;
    senderName?: string;
    senderPhotoUrl?: string;
}

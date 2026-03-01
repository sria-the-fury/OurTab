export type NotificationType = 'expense' | 'settlement' | 'shopping' | 'house' | 'birthday' | 'expense_todo';

export type NotificationActionType =
    | 'approve_payment'
    | 'approve_leave'
    | 'approve_deletion'
    | 'approve_fund_deposit'
    | 'approve_meal_off';

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
    actionType?: NotificationActionType;
    metadata?: Record<string, string>;
}

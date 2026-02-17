export interface Contributor {
    email: string;
    amount: number;
}

export enum SettlementStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    SKIPPED = 'skipped'
}

export interface SettlementItem {
    from: string; // email
    to: string; // email
    amount: number;
    paid: boolean;
}

export interface Settlement {
    id?: string;
    groupId: string;
    month: number; // 0-11
    year: number;
    settlements: SettlementItem[];
    createdAt: string;
    updatedAt: string;
}

export interface ExpenseWithContributors {
    id: string;
    amount: number;
    description: string;
    userId: string;
    groupId: string;
    date: string;
    contributors?: Contributor[];
}

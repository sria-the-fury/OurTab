export interface FundDeposit {
    id?: string;
    houseId: string;
    email: string;
    amount: number;
    date: string; // YYYY-MM-DD format
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    createdAt?: string;
}

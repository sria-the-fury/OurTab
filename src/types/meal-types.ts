export interface MealStatus {
    id?: string;
    houseId: string;
    date: string; // YYYY-MM-DD format
    meals: {
        [email: string]: {
            breakfast?: boolean;
            lunch?: boolean;
            dinner?: boolean;
        }
    };
    createdAt?: string;
    updatedAt?: string;
}

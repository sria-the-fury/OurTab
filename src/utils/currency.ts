export const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BDT: '৳',
    INR: '₹',
};

export function getCurrencySymbol(currencyCode?: string): string {
    if (!currencyCode) return '$';
    return currencySymbols[currencyCode.toUpperCase()] || '$';
}

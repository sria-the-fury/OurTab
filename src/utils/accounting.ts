import { House, Expense } from '@/hooks/useHouseData';
import { FundDeposit } from '@/types/fund-types';
import { isTakingMeal } from './meals';

export interface MemberAccounting {
    deposits: number;
    rent: number;
    utilities: number;
    wage: number;
    mealCount: number;
    mealCost: number;
}

export type MemberAccountingRecord = Record<string, MemberAccounting>;

export interface HouseAccountingSummary {
    totalDeposits: number;
    totalRent: number;
    totalUtilities: number;
    totalWages: number;
    totalGroceries: number;
    totalMeals: number;
    costPerMeal: number;
    previousMonthsRemaining: number;
    remainingFund: number;
}

export interface HouseAccountingResult {
    members: MemberAccountingRecord;
    summary: HouseAccountingSummary;
}

export function calculateMemberFundAccounting(
    house: House | null | undefined,
    expenses: Expense[],
    fundDeposits: FundDeposit[],
    meals: any[]
): HouseAccountingResult {
    const emptyResult: HouseAccountingResult = {
        members: {},
        summary: {
            totalDeposits: 0,
            totalRent: 0,
            totalUtilities: 0,
            totalWages: 0,
            totalGroceries: 0,
            totalMeals: 0,
            costPerMeal: 0,
            previousMonthsRemaining: 0,
            remainingFund: 0
        }
    };

    if (!house || !house.members || house.typeOfHouse !== 'meals_and_expenses') return emptyResult;

    const members = house.members;
    const stats: MemberAccountingRecord = {};

    const getEmail = (m: any) => typeof m === 'string' ? m : m.email;
    members.forEach(m => {
        stats[getEmail(m)] = { deposits: 0, rent: 0, utilities: 0, wage: 0, mealCount: 0, mealCost: 0 };
    });

    const getYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Collect all unique months across all history
    const months = new Set<string>();
    (expenses || []).forEach(e => months.add(getYYYYMM(new Date(e.date))));
    (fundDeposits || []).filter(d => d.status === 'approved').forEach(d => {
        months.add(getYYYYMM(new Date(d.createdAt || d.date)));
    });
    (meals || []).forEach(m => months.add(m.date.substring(0, 7)));

    const targetMonth = getYYYYMM(new Date());
    months.add(targetMonth);

    const sortedMonths = Array.from(months).sort();

    // Summary counters
    let houseTotalDeposits = 0;
    let houseTotalRent = 0;
    let houseTotalUtilities = 0;
    let houseTotalWages = 0;
    let houseTotalGroceries = 0;
    let houseTotalMeals = 0;
    let previousMonthsRemaining = 0;

    for (const monthStr of sortedMonths) {
        if (monthStr > targetMonth) break;

        const isPreviousMonth = monthStr < targetMonth;

        const mealsPerDay = house.mealsPerDay || 3;
        const monthlyMemberMeals: { [key: string]: number } = {};
        members.forEach(m => monthlyMemberMeals[getEmail(m)] = 0);

        // Calculate meals for this month
        meals.filter(m => m.date.startsWith(monthStr)).forEach(dayRecord => {
            members.forEach(m => {
                const mEmail = getEmail(m);
                const dateStr = dayRecord.date;

                if (mealsPerDay === 3 && isTakingMeal(mEmail, dateStr, 'breakfast', house, meals)) monthlyMemberMeals[mEmail]++;
                if (isTakingMeal(mEmail, dateStr, 'lunch', house, meals)) monthlyMemberMeals[mEmail]++;
                if (isTakingMeal(mEmail, dateStr, 'dinner', house, meals)) monthlyMemberMeals[mEmail]++;
            });
        });

        const monthlyMealsConsumed = Object.values(monthlyMemberMeals).reduce((sum, count) => sum + count, 0);
        houseTotalMeals += monthlyMealsConsumed;

        // Deposits for this month
        let monthlyDeposits = 0;
        (fundDeposits || [])
            .filter(d => d.status === 'approved' && getYYYYMM(new Date(d.createdAt || d.date)) === monthStr)
            .forEach(d => {
                if (stats[d.email]) stats[d.email].deposits += Number(d.amount);
                houseTotalDeposits += Number(d.amount);
                monthlyDeposits += Number(d.amount);
            });

        // Rent for this month
        let monthlyRent = 0;
        members.forEach(m => {
            const mEmail = getEmail(m);
            const rent = Number(m.rentAmount || 0);
            if (stats[mEmail]) stats[mEmail].rent += rent;
            houseTotalRent += rent;
            monthlyRent += rent;
        });

        // Expenses for this month
        let monthlyGroceries = 0;
        let monthlyUtilities = 0;
        let monthlyWage = 0;
        let monthlyMisc = 0;

        (expenses || [])
            .filter(e => !e.isSettlementPayment && getYYYYMM(new Date(e.date)) === monthStr)
            .forEach(exp => {
                if (exp.category === 'groceries' || !exp.category) monthlyGroceries += Number(exp.amount);
                else if (exp.category === 'utilities') monthlyUtilities += Number(exp.amount);
                else if (exp.category === 'wage') monthlyWage += Number(exp.amount);
                else monthlyMisc += Number(exp.amount);
            });

        houseTotalGroceries += monthlyGroceries;
        houseTotalUtilities += monthlyUtilities;
        houseTotalWages += monthlyWage;
        houseTotalUtilities += monthlyMisc; // Adding misc to utilities for simplicity in summary

        const totalMonthlyExpenses = monthlyRent + monthlyUtilities + monthlyWage + monthlyMisc + monthlyGroceries;
        if (isPreviousMonth) {
            previousMonthsRemaining += (monthlyDeposits - totalMonthlyExpenses);
        }

        const utilShare = members.length > 0 ? (monthlyUtilities / members.length) : 0;
        const wageShare = members.length > 0 ? (monthlyWage / members.length) : 0;
        const miscShare = members.length > 0 ? (monthlyMisc / members.length) : 0;
        const mealUnitPrice = monthlyMealsConsumed > 0 ? (monthlyGroceries / monthlyMealsConsumed) : 0;

        members.forEach(m => {
            const mEmail = getEmail(m);
            if (stats[mEmail]) {
                stats[mEmail].utilities += utilShare;
                stats[mEmail].wage += wageShare;
                stats[mEmail].utilities += miscShare;
                stats[mEmail].mealCount += monthlyMemberMeals[mEmail];
                stats[mEmail].mealCost += monthlyMemberMeals[mEmail] * mealUnitPrice;
            }
        });
    }

    return {
        members: stats,
        summary: {
            totalDeposits: houseTotalDeposits,
            totalRent: houseTotalRent,
            totalUtilities: houseTotalUtilities,
            totalWages: houseTotalWages,
            totalGroceries: houseTotalGroceries,
            totalMeals: houseTotalMeals,
            costPerMeal: houseTotalMeals > 0 ? (houseTotalGroceries / houseTotalMeals) : 0,
            previousMonthsRemaining: previousMonthsRemaining,
            remainingFund: houseTotalDeposits - (houseTotalRent + houseTotalUtilities + houseTotalWages + houseTotalGroceries)
        }
    };
}

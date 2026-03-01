
/**
 * Centralized utility to determine if a member is taking a specific meal on a given date.
 * It respects both explicit meal records and member-level "meals enabled" / "off from date" settings.
 */
export function isTakingMeal(
    memberEmail: string,
    dateStr: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    house: any, // House object containing memberDetails and members
    meals: any[] // Array of meal records for the house
): boolean {
    if (!house) return false;

    // 1. Check if the member has meals turned off globally or from a specific date
    const memberDetail = house.memberDetails?.[memberEmail];
    if (memberDetail) {
        if (memberDetail.mealsEnabled === false && memberDetail.offFromDate && dateStr >= memberDetail.offFromDate) {
            return false;
        }
    }

    // 2. Check if there is an explicit record for this day and member
    const dayRecord = (meals || []).find(m => m.date === dateStr);
    if (dayRecord && dayRecord.meals && dayRecord.meals[memberEmail]) {
        const mMeals = dayRecord.meals[memberEmail];
        if (mMeals[mealType] !== undefined) {
            return mMeals[mealType];
        }
    }

    // 3. Default to true if no record exists and they haven't turned off meals
    return true;
}

/**
 * Helper to count total meals for a member on a specific date string.
 */
export function countMemberMeals(
    memberEmail: string,
    dateStr: string,
    house: any,
    meals: any[]
): number {
    const mealsPerDay = house?.mealsPerDay || 3;
    let count = 0;

    if (mealsPerDay === 3 && isTakingMeal(memberEmail, dateStr, 'breakfast', house, meals)) count++;
    if (isTakingMeal(memberEmail, dateStr, 'lunch', house, meals)) count++;
    if (isTakingMeal(memberEmail, dateStr, 'dinner', house, meals)) count++;

    return count;
}

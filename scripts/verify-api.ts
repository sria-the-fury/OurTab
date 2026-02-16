
async function verify() {
    const baseUrl = 'http://localhost:3000/api';
    const email = 'jakariamsria@gmail.com';
    const name = 'Jakaria';

    console.log(`1. Creating/Syncing User: ${email}`);
    const userRes = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, photoUrl: 'https://example.com/photo.jpg' })
    });
    const user = await userRes.json();
    console.log('User Response:', user);

    if (!user.email) {
        console.error('Failed to create user');
        return;
    }

    console.log('\n2. Creating Group');
    const groupRes = await fetch(`${baseUrl}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jakaria Family', createdBy: email })
    });
    const group = await groupRes.json();
    console.log('Group Response:', group);

    if (!group.id) {
        console.error('Failed to create group');
        return;
    }

    console.log('\n3. Adding Expense');
    const expenseRes = await fetch(`${baseUrl}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: 50.50,
            description: 'Test Grocery Run',
            userId: email, // Using email as ID for this app architecture
            groupId: group.id
        })
    });
    const expense = await expenseRes.json();
    console.log('Expense Response:', expense);

    console.log('\n4. Verifying Dashboard Data (Get Expenses)');
    const dashboardRes = await fetch(`${baseUrl}/expenses?groupId=${group.id}`);
    const dashboardData = await dashboardRes.json();
    console.log('Dashboard Data:', dashboardData);

    console.log('\n5. Testing Single Group Restriction');
    const group2Res = await fetch(`${baseUrl}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Should Fail Group', createdBy: email })
    });
    if (group2Res.status === 400) {
        console.log('PASS: Prevented creating second group.');
    } else {
        console.error('FAIL: Created second group:', await group2Res.json());
    }

}

verify().catch(console.error);

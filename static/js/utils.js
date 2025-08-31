export let allTransactions = [];

export function showSpinner() {
    document.getElementById('spinner').classList.add('show');
}

export function hideSpinner() {
    document.getElementById('spinner').classList.remove('show');
}

export function validateTransactionForm() {
    const category = document.getElementById('category').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    let isValid = true;

    document.getElementById('category').classList.remove('is-invalid');
    document.getElementById('amount').classList.remove('is-invalid');
    document.getElementById('date').classList.remove('is-invalid');

    if (!category) {
        document.getElementById('category').classList.add('is-invalid');
        isValid = false;
    }
    if (!amount || amount <= 0) {
        document.getElementById('amount').classList.add('is-invalid');
        isValid = false;
    }
    if (!date) {
        document.getElementById('date').classList.add('is-invalid');
        isValid = false;
    }
    return isValid;
}

export function validateGoalForm() {
    const goalName = document.getElementById('modal-goal-name').value;
    const targetAmount = document.getElementById('modal-target-amount').value;
    const deadline = document.getElementById('modal-deadline').value;
    let isValid = true;

    if (!goalName) {
        isValid = false;
    }
    if (!targetAmount || targetAmount <= 0) {
        isValid = false;
    }
    if (!deadline) {
        isValid = false;
    }
    return isValid;
}

export function validateDates() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    document.getElementById('start-date').classList.remove('is-invalid');
    document.getElementById('end-date').classList.remove('is-invalid');

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        document.getElementById('start-date').classList.add('is-invalid');
        document.getElementById('end-date').classList.add('is-invalid');
        alert('Start date cannot be after end date.');
        return false;
    }
    if ((startDate && !endDate) || (!startDate && endDate)) {
        document.getElementById('start-date').classList.add('is-invalid');
        document.getElementById('end-date').classList.add('is-invalid');
        alert('Please provide both start and end dates or leave both empty.');
        return false;
    }
    return true;
}

export function startOnboardingTour() {
    if (localStorage.getItem('tourCompleted') === 'true') return;
    introJs().setOptions({
        steps: [
            { intro: 'Welcome to Finance App! Let\'s take a quick tour.' },
            { element: '#trans-form', intro: 'Add transactions here. Choose type, category, amount, and date.' },
            { element: '#add-category-form', intro: 'Add custom categories for personalized tracking.' },
            { element: '#monthly-spending-display', intro: 'See your total spending for the current month.' },
            { element: '#filter-form', intro: 'Apply filters for daily, weekly, or monthly views.' },
            { element: document.querySelector('[data-step="5"]'), intro: 'Your transaction list with delete options.' },
            { element: document.querySelector('[data-step="6"]'), intro: 'Expense breakdown pie chart.' },
            { element: document.querySelector('[data-step="7"]'), intro: 'Spending trend line chart.' },
            { element: '#goals-card', intro: 'Set and track financial goals.' },
            { element: '#net-worth-card', intro: 'Track your net worth and assets.' },
            { element: '#recurring-trans-card', intro: 'Manage recurring transactions and subscriptions.' },
            { element: '#budget-card', intro: 'Budget recommendations.' },
            { element: '#analyze-card', intro: 'Overspending analysis.' },
            { element: '#investments-card', intro: 'Investment suggestions.' },
            { element: '#offers-card', intro: 'Personalized offers.' },
            { element: '#forecast-card', intro: 'Future expense forecast.' },
            { element: '#budget-alerts-card', intro: 'Budget alerts to keep you on track.' }
        ]
    }).start().onexit(() => {
        localStorage.setItem('tourCompleted', 'true');
    });
}

export function filterTransactions(transactions, period, startDate, endDate) {
    if (!transactions || !Array.isArray(transactions)) return [];
    let filtered = transactions;

    console.log('Filtering transactions:', { transactions, period, startDate, endDate });

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filtered = transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= start && transDate <= end;
        });
    }

    const dateMap = new Map();

    filtered.forEach(t => {
        const transDate = new Date(t.date);
        if (isNaN(transDate)) {
            console.warn(`Invalid date for transaction ID ${t.id}: ${t.date}`);
            return;
        }
        let key;

        if (period === 'daily') {
            key = transDate.toISOString().split('T')[0];
        } else if (period === 'weekly') {
            const weekStart = new Date(transDate);
            weekStart.setDate(transDate.getDate() - transDate.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else if (period === 'monthly') {
            key = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
        }

        dateMap.set(t.id, { ...t, periodKey: key });
    });

    return Array.from(dateMap.values());
}
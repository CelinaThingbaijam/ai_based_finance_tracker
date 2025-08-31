// modals.js
import { showSpinner, hideSpinner } from './utils.js';
import { recurringPieChart } from './theme.js';
import { loadDashboard } from './dashboard.js'; 


export function showTransactionsModal(transactions, category = null) {
    if (category) {
        const modalTitle = document.getElementById('transactionsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Transactions - ${category}`;
        }
    }

    const transactionsModalBody = document.getElementById('all-transactions-list');
    transactionsModalBody.innerHTML = transactions.map(t => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>
                <i class="fas ${t.type === 'income' ? 'fa-plus-circle text-success' : 'fa-minus-circle text-danger'}"></i>
                ${t.date}: ${t.category} ₹${t.amount.toFixed(2)}
            </span>
            <button class="btn btn-delete" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
        </li>
    `).join('');

    const transactionsModal = new bootstrap.Modal(document.getElementById('transactionsModal'));
    transactionsModal.show();
}

export async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    showSpinner();
    try {
        const response = await fetch('/delete_transaction', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: transactionId })
        });
        const result = await response.json();
        console.log('Delete transaction response:', result);
        if (result.status === 'success') {
            alert('Transaction deleted!');
            loadDashboard();
        } else {
            alert('Error deleting transaction: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function loadGoals() {
    showSpinner();
    try {
        const response = await fetch('/get_goals');
        const data = await response.json();
        console.log('Goals:', data);
        if (data.status === 'error') {
            console.error('Error fetching goals:', data.message);
            return;
        }
        const goalsList = document.getElementById('modal-goals-list');
        const today = new Date();
        goalsList.innerHTML = data.goals.length > 0 ? data.goals.map(g => {
            const deadline = new Date(g.deadline);
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            const warning = daysLeft <= 7 && daysLeft > 0 ? ` <span class="text-danger">(Warning: ${daysLeft} days left!)</span>` : '';
            
            // FIX: Calculate progress for the progress bar
            const progress = (g.current_amount / g.target_amount) * 100;
            const progressColor = progress >= 100 ? 'bg-success' : 'bg-info';
            
            return `
                <li class="mb-4" data-goal-id="${g.id}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${g.goal_name}:</strong> ₹${g.current_amount.toFixed(2)} / ₹${g.target_amount.toFixed(2)} 
                            <small class="text-muted">(Deadline: ${g.deadline}${warning})</small>
                        </div>
                        <div>
                            <span class="badge rounded-pill bg-primary me-2">${progress.toFixed(0)}%</span>
                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="showEditGoalModal(${g.id}, '${g.goal_name}', ${g.target_amount}, '${g.deadline}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteGoal(${g.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </li>`;
        }).join('') : '<li>No goals set</li>';
    } catch (error) {
        console.error('Error loading goals:', error);
        alert('Error loading goals: ' + error.message);
    } finally {
        hideSpinner();
    }
}

// FIX: Add a new function to set up the goal form listener
export function setupGoalForm() {
    const form = document.getElementById('modal-goal-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const goalName = document.getElementById('modal-goal-name').value;
            const targetAmount = document.getElementById('modal-target-amount').value;
            const deadline = document.getElementById('modal-deadline').value;

            if (!goalName || !targetAmount || !deadline || parseFloat(targetAmount) <= 0) {
                alert('Please fill out all fields with valid data.');
                return;
            }

            showSpinner();
            try {
                const response = await fetch('/add_goal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goal_name: goalName, target_amount: parseFloat(targetAmount), deadline: deadline })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Goal added successfully!');
                    form.reset();
                    loadGoals(); // Refresh the list of goals
                    loadDashboard(); // Refresh the dashboard summary
                } else {
                    alert('Error adding goal: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding goal:', error);
                alert('Error adding goal: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export async function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this financial goal?')) {
        return;
    }
    showSpinner();
    try {
        const response = await fetch('/delete_goal', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: goalId })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert('Goal deleted successfully!');
            loadGoals();
        } else {
            alert('Error deleting goal: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Error deleting goal: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export function showEditGoalModal(id, name, target, deadline) {
    document.getElementById('edit-goal-id').value = id;
    document.getElementById('edit-goal-name').value = name;
    document.getElementById('edit-target-amount').value = target;
    document.getElementById('edit-deadline').value = deadline;
    const editGoalModal = new bootstrap.Modal(document.getElementById('editGoalModal'));
    editGoalModal.show();
}

export async function loadNetWorth() {
    showSpinner();
    try {
        const response = await fetch('/net_worth');
        const data = await response.json();
        if (data.status === 'error') {
            alert('Error loading net worth data: ' + data.message);
            return;
        }

        document.getElementById('current-net-worth').textContent = `₹${data.net_worth.toFixed(2)}`;

        const assetsList = document.getElementById('assets-list');
        assetsList.innerHTML = data.assets.map(a => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span><strong>${a.name}</strong> (${a.type}): ₹${a.current_value.toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAsset(${a.id})"><i class="fas fa-trash"></i></button>
            </li>
        `).join('');

        const debtsList = document.getElementById('debts-list');
        debtsList.innerHTML = data.debts.map(d => `
            <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span><strong>${d.name}</strong>: Owed ₹${d.amount_owed.toFixed(2)}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDebt(${d.id})"><i class="fas fa-trash"></i></button>
                </div>
                <div class="input-group">
                    <span class="input-group-text">Pay</span>
                    <input type="number" class="form-control form-control-sm" id="pay-debt-${d.id}" placeholder="Amount (₹)" min="0" step="0.01">
                    <button class="btn btn-sm btn-primary" onclick="payDebt(${d.id})">Pay</button>
                </div>
            </li>
        `).join('');

    } catch (error) {
        console.error('Error loading net worth modal:', error);
        alert('Error loading net worth modal: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function payDebt(debtId) {
    const amountPaid = parseFloat(document.getElementById(`pay-debt-${debtId}`).value);
    if (isNaN(amountPaid) || amountPaid <= 0) {
        alert('Please enter a valid amount to pay.');
        return;
    }
    
    if (!confirm(`Are you sure you want to make a payment of ₹${amountPaid.toFixed(2)}?`)) {
        return;
    }

    showSpinner();
    try {
        const response = await fetch('/pay_debt', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: debtId, amount: amountPaid })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('Payment recorded successfully!');
            loadNetWorth();
        } else {
            alert('Error recording payment: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error making payment:', error);
        alert('Error making payment: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function deleteAsset(assetId) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    showSpinner();
    try {
        const response = await fetch(`/assets/${assetId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') {
            alert('Asset deleted!');
            loadNetWorth();
        } else {
            alert('Error deleting asset: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Error deleting asset: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function deleteDebt(debtId) {
    if (!confirm('Are you sure you want to delete this debt?')) return;
    showSpinner();
    try {
        const response = await fetch(`/debts/${debtId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') {
            alert('Debt deleted!');
            loadNetWorth();
        } else {
            alert('Error deleting debt: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting debt:', error);
        alert('Error deleting debt: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function loadRecurringTransactions() {
    showSpinner();
    try {
        const [transRes, vizRes] = await Promise.all([
            fetch('/recurring_transactions'),
            fetch('/recurring_viz_data')
        ]);
        
        const transData = await transRes.json();
        const vizData = await vizRes.json();

        if (transData.status === 'error') {
            alert('Error loading recurring transactions: ' + transData.message);
            return;
        }

        if (vizData.status === 'error') {
            console.error('Error loading recurring visualization data:', vizData.message);
        }

        const recurringList = document.getElementById('recurring-list');
        recurringList.innerHTML = transData.recurring_transactions.map(t => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>
                    <i class="fas fa-${t.type === 'income' ? 'plus-circle text-success' : 'minus-circle text-danger'} me-2"></i>
                    <strong>${t.category}</strong>: ₹${t.amount.toFixed(2)} (${t.frequency})
                </span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRecurringTransaction(${t.id})"><i class="fas fa-trash"></i></button>
            </li>
        `).join('');

        const recurringSummary = document.getElementById('recurring-trans-summary');
        recurringSummary.textContent = `You have ${transData.recurring_transactions.length} recurring items. Click to manage.`;

        // The corrected, more robust check. It verifies the existence and type of the chart object.
        if (window.recurringPieChart && typeof window.recurringPieChart.destroy === 'function') {
            window.recurringPieChart.destroy();
        }

        const categories = Object.keys(vizData.breakdown);
        const amounts = Object.values(vizData.breakdown);

        if (categories.length > 0) {
            const chartElement = document.getElementById('recurringPieChart');
            if (chartElement) {
                window.recurringPieChart = new Chart(chartElement, {
                    type: 'pie',
                    data: {
                        labels: categories,
                        datasets: [{
                            data: amounts,
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333'
                                }
                            }
                        }
                    }
                });
            }
        } else {
            // If there's no data, ensure the chart variable is nullified to prevent future errors
            window.recurringPieChart = null;
        }

    } catch (error) {
        console.error('Error loading recurring transactions modal:', error);
        alert('Error loading recurring transactions modal: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export async function deleteRecurringTransaction(transId) {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return;
    showSpinner();
    try {
        const response = await fetch(`/recurring_transactions/${transId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') {
            alert('Recurring transaction deleted!');
            loadRecurringTransactions();
        } else {
            alert('Error deleting recurring transaction: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        alert('Error deleting recurring transaction: ' + error.message);
    } finally {
        hideSpinner();
    }
}

export function setupGoalsCard() {
    const goalsCard = document.getElementById('goals-card');
    if (goalsCard) {
        goalsCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const goalsModal = new bootstrap.Modal(document.getElementById('goalsModal'));
                goalsModal.show();
                await loadGoals();
            } catch (error) {
                console.error('Error setting up goals modal:', error);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupNetWorthCard() {
    const netWorthCard = document.getElementById('net-worth-card');
    if (netWorthCard) {
        netWorthCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const netWorthModal = new bootstrap.Modal(document.getElementById('netWorthModal'));
                netWorthModal.show();
                await loadNetWorth();
            } catch (error) {
                console.error('Error setting up net worth modal:', error);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupRecurringTransCard() {
    const recurringTransCard = document.getElementById('recurring-trans-card');
    if (recurringTransCard) {
        recurringTransCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const recurringTransModal = new bootstrap.Modal(document.getElementById('recurringTransModal'));
                recurringTransModal.show();
                await loadRecurringTransactions();
            } catch (error) {
                console.error('Error setting up recurring transactions modal:', error);
            } finally {
                hideSpinner();
            }
        });
    }
}

// modals.js
export function setupBudgetCard() {
    const budgetCard = document.getElementById('budget-card');
    if (budgetCard) {
        budgetCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/budget');
                const budget = await response.json();
                if (budget.status === 'error') {
                    alert('Error fetching budget: ' + budget.message);
                    return;
                }

                console.log('Budget data:', budget);

                const totalBudget = document.getElementById('total-budget');
                const budgetStatus = document.getElementById('budget-status');
                const detailedBudget = document.getElementById('detailed-budget');

                totalBudget.textContent = `₹${budget.total.toFixed(2)}`;
                budgetStatus.textContent = budget.warning || 'N/A';

                detailedBudget.innerHTML = Object.entries(budget.budgets).map(([cat, amt]) => {
                    const spent = budget.spending?.[cat] || 0;
                    const progress = amt > 0 ? Math.min((spent / amt) * 100, 100) : 0;
                    const progressColor = progress >= 100 ? 'bg-danger' : progress >= 80 ? 'bg-warning' : 'bg-success';
                    return `
                        <div class="mb-4" data-category="${cat}">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <strong>${cat}</strong>
                                <div class="input-group w-50">
                                    <span class="input-group-text">Budget (₹)</span>
                                    <input type="number" class="form-control budget-input" data-category="${cat}" value="${amt.toFixed(2)}" min="0" step="0.01">
                                </div>
                            </div>
                            <div class="progress">
                                <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
                                    ₹${spent.toFixed(2)} / ₹${amt.toFixed(2)}
                                </div>
                            </div>
                            <small class="text-muted">${budget.savings_tips[cat] || 'No savings tips available.'}</small>
                        </div>
                    `;
                }).join('');

                const budgetModal = new bootstrap.Modal(document.getElementById('budgetModal'));
                budgetModal.show();

                document.getElementById('save-budget-changes').addEventListener('click', async () => {
                    const updatedBudgets = {};
                    let hasValidInput = false;
                    document.querySelectorAll('.budget-input').forEach(input => {
                        const category = input.getAttribute('data-category');
                        const amount = parseFloat(input.value);
                        if (!isNaN(amount) && amount >= 0) {
                            updatedBudgets[category] = amount;
                            hasValidInput = true;
                        }
                    });

                    if (!hasValidInput) {
                        alert('Please enter at least one valid budget amount.');
                        return;
                    }

                    console.log('Sending budgets:', updatedBudgets);

                    showSpinner();
                    try {
                        const response = await fetch('/update_budget', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ budgets: updatedBudgets })
                        });
                        const result = await response.json();
                        if (result.status === 'success') {
                            alert('Budgets updated successfully!');
                            budgetModal.hide();
                            loadDashboard();
                        } else {
                            alert('Error updating budgets: ' + (result.message || 'Unknown error'));
                        }
                    } catch (error) {
                        console.error('Error updating budgets:', error);
                        alert('Error updating budgets: ' + error.message);
                    } finally {
                        hideSpinner();
                    }
                });
            } catch (error) {
                console.error('Error fetching budget details:', error);
                alert('Error fetching budget details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupAnalyzeCard() {
    const analyzeCard = document.getElementById('analyze-card');
    if (analyzeCard) {
        analyzeCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/analyze');
                const analyze = await response.json();
                if (analyze.status === 'error') {
                    alert('Error fetching analysis: ' + analyze.message);
                    return;
                }
                const detailedAnalyze = document.getElementById('detailed-analyze');
                detailedAnalyze.innerHTML = `
                    <h6>Potential Savings: ₹${analyze.potential_savings.toFixed(2)}</h6>
                    <h6>Overspending Details:</h6>
                    <ul>
                        ${Object.entries(analyze.overspend).map(([cat, amt]) => `
                            <li>
                                <strong>${cat}:</strong> Overspent by ₹${amt.toFixed(2)}
                            </li>
                        `).join('') || '<li>No significant overspending detected.</li>'}
                    </ul>
                `;
                const analyzeModal = new bootstrap.Modal(document.getElementById('analyzeModal'));
                analyzeModal.show();
            } catch (error) {
                console.error('Error fetching overspending details:', error);
                alert('Error fetching overspending details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupInvestmentsCard() {
    const investmentsCard = document.getElementById('investments-card');
    if (investmentsCard) {
        investmentsCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/investments');
                const invest = await response.json();
                if (invest.status === 'error') {
                    alert('Error fetching investments: ' + invest.message);
                    return;
                }
                const detailedInvestments = document.getElementById('detailed-investments');
                detailedInvestments.innerHTML = `
                    <h6>Suggestions:</h6>
                    <ul>
                        ${invest.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                `;
                const investmentsModal = new bootstrap.Modal(document.getElementById('investmentsModal'));
                investmentsModal.show();
            } catch (error) {
                console.error('Error fetching investment details:', error);
                alert('Error fetching investment details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupOffersCard() {
    const offersCard = document.getElementById('offers-card');
    if (offersCard) {
        offersCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/offers');
                const offers = await response.json();
                if (offers.status === 'error') {
                    alert('Error fetching offers: ' + offers.message);
                    return;
                }
                const detailedOffers = document.getElementById('detailed-offers');
                detailedOffers.innerHTML = `
                    <h6>Offers for you:</h6>
                    <ul>
                        ${offers.offers.map(o => `<li>${o}</li>`).join('') || '<li>No specific offers available.</li>'}
                    </ul>
                `;
                const offersModal = new bootstrap.Modal(document.getElementById('offersModal'));
                offersModal.show();
            } catch (error) {
                console.error('Error fetching offers details:', error);
                alert('Error fetching offers details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupForecastCard() {
    const foreCastCard = document.getElementById('forecast-card');
    if (foreCastCard) {
        foreCastCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/forecast');
                const forecast = await response.json();
                if (forecast.status === 'error') {
                    alert('Error fetching forecast: ' + forecast.message);
                    return;
                }
                const detailedForecast = document.getElementById('detailed-forecast');
                detailedForecast.innerHTML = `
                    <h6>Next Month's Expense Forecast:</h6>
                    <p>Based on your historical spending, your projected expenses for the next month are approximately:</p>
                    <p class="h4"><strong>₹${forecast.next_month_exp.toFixed(2)}</strong></p>
                `;
                const forecastModal = new bootstrap.Modal(document.getElementById('forecastModal'));
                forecastModal.show();
            } catch (error) {
                console.error('Error fetching forecast details:', error);
                alert('Error fetching forecast details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupBudgetAlertsCard() {
    const budgetAlertsCard = document.getElementById('budget-alerts-card');
    if (budgetAlertsCard) {
        budgetAlertsCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/budget_alerts');
                const alertsData = await response.json();
                if (alertsData.status === 'error') {
                    alert('Error fetching alerts: ' + alertsData.message);
                    return;
                }
                const detailedAlerts = document.getElementById('detailed-budget-alerts');
                detailedAlerts.innerHTML = alertsData.alerts.map(alert => `
                    <div class="alert alert-danger" role="alert">
                        <strong>${alert.category} Alert:</strong> ${alert.message}
                        <p class="mb-0 mt-2">Spent: ₹${alert.spent} | Budget: ₹${alert.budget}</p>
                    </div>
                `).join('') || '<div class="alert alert-success" role="alert">No alerts! You\'re on track with your budget.</div>';

                const budgetAlertsModal = new bootstrap.Modal(document.getElementById('budgetAlertsModal'));
                budgetAlertsModal.show();
            } catch (error) {
                console.error('Error fetching budget alerts:', error);
                alert('Error fetching budget alerts: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}
// modals.js

export function setupMonthlySummaryCard() {
    const monthlySummaryCard = document.getElementById('monthly-summary-card');
    if (monthlySummaryCard) {
        monthlySummaryCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const response = await fetch('/monthly_comparison');
                const data = await response.json();
                
                if (data.status === 'error' || !data.current_month || !data.previous_month) {
                    console.error('Invalid monthly comparison data:', data);
                    document.getElementById('monthlyComparisonChart').parentElement.innerHTML = '<p>Error loading comparison data.</p>';
                    alert('Error loading monthly comparison data: ' + (data.message || 'Invalid data'));
                    return;
                }

                const currentMonthTotal = document.getElementById('current-month-total');
                const prevMonthTotal = document.getElementById('prev-month-total');
                const comparisonTableBody = document.getElementById('comparison-table-body');
                const comparisonChartElement = document.getElementById('monthlyComparisonChart');

                currentMonthTotal.textContent = `₹${(data.current_month.total_expenses || 0).toFixed(2)}`;
                prevMonthTotal.textContent = `₹${(data.previous_month.total_expenses || 0).toFixed(2)}`;

                // Get all unique categories from both months
                const allCategories = [...new Set([...Object.keys(data.current_month.breakdown || {}), ...Object.keys(data.previous_month.breakdown || {})])];
                
                comparisonTableBody.innerHTML = allCategories.map(cat => {
                    const currentAmount = data.current_month.breakdown[cat] || 0;
                    const prevAmount = data.previous_month.breakdown[cat] || 0;
                    return `
                        <tr>
                            <td>${cat}</td>
                            <td>₹${currentAmount.toFixed(2)}</td>
                            <td>₹${prevAmount.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('');

                // Destroy existing chart safely
                if (window.monthlyComparisonChart && typeof window.monthlyComparisonChart.destroy === 'function') {
                    window.monthlyComparisonChart.destroy();
                }
                window.monthlyComparisonChart = null;

                // Render the comparison chart
                if (allCategories.length > 0) {
                    window.monthlyComparisonChart = new Chart(comparisonChartElement, {
                        type: 'bar',
                        data: {
                            labels: allCategories,
                            datasets: [
                                {
                                    label: 'This Month',
                                    data: allCategories.map(cat => data.current_month.breakdown[cat] || 0),
                                    backgroundColor: '#dc3545'
                                },
                                {
                                    label: 'Last Month',
                                    data: allCategories.map(cat => data.previous_month.breakdown[cat] || 0),
                                    backgroundColor: '#6c757d'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                x: { stacked: true, ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' } },
                                y: { stacked: true, ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' } }
                            },
                            plugins: {
                                legend: {
                                    labels: {
                                        color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333'
                                    }
                                }
                            }
                        }
                    });
                } else {
                    console.warn('No categories available for monthly comparison chart.');
                    comparisonChartElement.parentElement.innerHTML = '<p>No data available for comparison.</p>';
                }

                const monthlyComparisonModal = new bootstrap.Modal(document.getElementById('monthlyComparisonModal'));
                monthlyComparisonModal.show();
            } catch (error) {
                console.error('Error fetching monthly comparison details:', error);
                alert('Error fetching monthly comparison details: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupTrendCard() {
    const trendCard = document.querySelector('.card:has(#trendChart)'); // Select the card containing trendChart
    if (trendCard) {
        trendCard.addEventListener('click', async () => {
            showSpinner();
            try {
                const trendModal = new bootstrap.Modal(document.getElementById('trendModal'));
                trendModal.show();
                await loadTrendModal();
            } catch (error) {
                console.error('Error setting up trend modal:', error);
                alert('Error setting up trend modal: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

// New function to load trend modal content
async function loadTrendModal() {
    const periodSelect = document.getElementById('trend-period');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const trendChartElement = document.getElementById('detailedTrendChart');
    const trendTableBody = document.getElementById('trend-table-body');
    const trendSummary = document.getElementById('trend-summary');

    const startDate = startDateInput.value || null;
    const endDate = endDateInput.value || null;
    let period = periodSelect.value || 'monthly';

    try {
        const vizUrl = `/visualize/${period}${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''}`;
        const response = await fetch(vizUrl);
        const viz = await response.json();

        console.log('viz data:', viz); // Debug log to inspect response

        if (viz.status === 'error' || !viz.trend) {
            console.error('Error fetching trend data:', viz.message || 'No trend data');
            trendChartElement.parentElement.innerHTML = '<p>Error loading trend data.</p>';
            trendTableBody.innerHTML = '<tr><td colspan="2">Error loading data</td></tr>';
            if (trendSummary) trendSummary.innerHTML = '<p>Error loading trend summary.</p>';
            return;
        }

        // Destroy existing chart safely
        if (window.detailedTrendChart && typeof window.detailedTrendChart.destroy === 'function') {
            window.detailedTrendChart.destroy();
        }
        window.detailedTrendChart = null;

        // Initialize trend data
        let trendLabels = [];
        let trendData = [];

        // Process trend data
        if (viz.trend.labels && viz.trend.data) {
            trendLabels = viz.trend.labels;
            trendData = viz.trend.data;
        } else if (Array.isArray(viz.trend)) {
            trendLabels = viz.trend.map(item => item.month || item.label || 'N/A');
            trendData = viz.trend.map(item => item.amount || item.value || 0);
        } else if (typeof viz.trend === 'object' && viz.trend !== null) {
            trendLabels = Object.keys(viz.trend);
            trendData = Object.values(viz.trend);
        } else {
            console.warn('Invalid trend data format:', viz.trend);
            trendLabels = [];
            trendData = [];
        }

        // Render chart and table only if valid data exists
        if (trendLabels.length > 0 && trendData.length > 0) {
            // Render chart
            window.detailedTrendChart = new Chart(trendChartElement, {
                type: 'line',
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: 'Spending Trend',
                        data: trendData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54,162,235,0.2)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333'
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Date', color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' },
                            ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' }
                        },
                        y: {
                            title: { display: true, text: 'Amount (₹)', color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' },
                            grid: { color: document.body.classList.contains('dark-theme') ? '#444' : '#e0e0e0' },
                            ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' }
                        }
                    }
                }
            });

            // Render table
            trendTableBody.innerHTML = trendLabels.map((label, index) => `
                <tr>
                    <td>${label}</td>
                    <td>₹${(trendData[index] || 0).toFixed(2)}</td>
                </tr>
            `).join('');

            // Render summary statistics
            if (trendSummary) {
                const avgSpending = trendData.length > 0 ? (trendData.reduce((sum, val) => sum + val, 0) / trendData.length).toFixed(2) : 0;
                const maxSpending = trendData.length > 0 ? Math.max(...trendData).toFixed(2) : 0;
                const minSpending = trendData.length > 0 ? Math.min(...trendData).toFixed(2) : 0;
                trendSummary.innerHTML = `
                    Average Spending: ₹${avgSpending}<br>
                    Highest Spending: ₹${maxSpending}<br>
                    Lowest Spending: ₹${minSpending}
                `;
            }
        } else {
            trendChartElement.parentElement.innerHTML = '<p>No trend data available.</p>';
            trendTableBody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
            if (trendSummary) trendSummary.innerHTML = '<p>No trend summary available.</p>';
        }

        // Add event listener for period changes
        periodSelect.addEventListener('change', async () => {
            period = periodSelect.value;
            const newVizUrl = `/visualize/${period}${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''}`;
            showSpinner();
            try {
                const response = await fetch(newVizUrl);
                const newViz = await response.json();

                console.log('newViz data:', newViz); // Debug log

                if (newViz.status === 'error' || !newViz.trend) {
                    console.error('Error fetching trend data:', newViz.message || 'No trend data');
                    trendChartElement.parentElement.innerHTML = '<p>Error loading trend data.</p>';
                    trendTableBody.innerHTML = '<tr><td colspan="2">Error loading data</td></tr>';
                    if (trendSummary) trendSummary.innerHTML = '<p>Error loading trend summary.</p>';
                    return;
                }

                // Update chart and table with new data
                let newTrendLabels = [];
                let newTrendData = [];

                if (newViz.trend.labels && newViz.trend.data) {
                    newTrendLabels = newViz.trend.labels;
                    newTrendData = newViz.trend.data;
                } else if (Array.isArray(newViz.trend)) {
                    newTrendLabels = newViz.trend.map(item => item.month || item.label || 'N/A');
                    newTrendData = newViz.trend.map(item => item.amount || item.value || 0);
                } else if (typeof newViz.trend === 'object' && newViz.trend !== null) {
                    newTrendLabels = Object.keys(newViz.trend);
                    newTrendData = Object.values(newViz.trend);
                } else {
                    console.warn('Invalid trend data format:', newViz.trend);
                    newTrendLabels = [];
                    newTrendData = [];
                }

                if (window.detailedTrendChart && typeof window.detailedTrendChart.destroy === 'function') {
                    window.detailedTrendChart.destroy();
                }
                window.detailedTrendChart = null;

                if (newTrendLabels.length > 0 && newTrendData.length > 0) {
                    window.detailedTrendChart = new Chart(trendChartElement, {
                        type: 'line',
                        data: {
                            labels: newTrendLabels,
                            datasets: [{
                                label: 'Spending Trend',
                                data: newTrendData,
                                borderColor: '#36A2EB',
                                backgroundColor: 'rgba(54,162,235,0.2)',
                                fill: true,
                                tension: 0.3
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    labels: {
                                        color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333'
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    title: { display: true, text: 'Date', color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' },
                                    ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' }
                                },
                                y: {
                                    title: { display: true, text: 'Amount (₹)', color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' },
                                    grid: { color: document.body.classList.contains('dark-theme') ? '#444' : '#e0e0e0' },
                                    ticks: { color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333' }
                                }
                            }
                        }
                    });

                    trendTableBody.innerHTML = newTrendLabels.map((label, index) => `
                        <tr>
                            <td>${label}</td>
                            <td>₹${(newTrendData[index] || 0).toFixed(2)}</td>
                        </tr>
                    `).join('');

                    if (trendSummary) {
                        const avgSpending = newTrendData.length > 0 ? (newTrendData.reduce((sum, val) => sum + val, 0) / newTrendData.length).toFixed(2) : 0;
                        const maxSpending = newTrendData.length > 0 ? Math.max(...newTrendData).toFixed(2) : 0;
                        const minSpending = newTrendData.length > 0 ? Math.min(...newTrendData).toFixed(2) : 0;
                        trendSummary.innerHTML = `
                            Average Spending: ₹${avgSpending}<br>
                            Highest Spending: ₹${maxSpending}<br>
                            Lowest Spending: ₹${minSpending}
                        `;
                    }
                } else {
                    trendChartElement.parentElement.innerHTML = '<p>No trend data available.</p>';
                    trendTableBody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
                    if (trendSummary) trendSummary.innerHTML = '<p>No trend summary available.</p>';
                }
            } catch (error) {
                console.error('Error updating trend modal:', error);
                alert('Error updating trend modal: ' + error.message);
                trendChartElement.parentElement.innerHTML = '<p>Error loading trend data.</p>';
                trendTableBody.innerHTML = '<tr><td colspan="2">Error loading data</td></tr>';
                if (trendSummary) trendSummary.innerHTML = '<p>Error loading trend summary.</p>';
            } finally {
                hideSpinner();
            }
        });
    } catch (error) {
        console.error('Error loading trend modal:', error);
        alert('Error loading trend modal: ' + error.message);
        trendChartElement.parentElement.innerHTML = '<p>Error loading trend data.</p>';
        trendTableBody.innerHTML = '<tr><td colspan="2">Error loading data</td></tr>';
        if (trendSummary) trendSummary.innerHTML = '<p>Error loading trend summary.</p>';
    }
}
// modals.js


window.deleteTransaction = deleteTransaction;
window.deleteGoal = deleteGoal;
window.showEditGoalModal = showEditGoalModal;
window.payDebt = payDebt;
window.deleteAsset = deleteAsset;
window.deleteDebt = deleteDebt;
window.deleteRecurringTransaction = deleteRecurringTransaction;

// dashboard.js
import { showSpinner, hideSpinner, filterTransactions } from './utils.js';
import { showTransactionsModal } from './modals.js';

export async function loadCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    try {
        const response = await fetch('/get_categories');
        const data = await response.json();
        
        if (data.status === 'error') {
            console.error('Error fetching categories:', data.message);
            return;
        }
        
        categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';
        data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Error loading categories: ' + error.message);
    }
}


export async function loadDashboard() {
    showSpinner();
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const periodSelect = document.getElementById('period');

    
    
    // Ensure default date range if empty
    if (startDateInput.value === '' && endDateInput.value === '') {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        startDateInput.value = startDate;
        endDateInput.value = endDate;
    }

    const startDate = startDateInput.value || null;
    const endDate = endDateInput.value || null;
    const period = periodSelect.value || 'monthly';

    console.log('loadDashboard inputs:', { startDate, endDate, period });

    try {
        const transUrl = `/get_transactions${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''}`;
        const vizUrl = `/visualize/${period}${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''}`;
        const monthlySummaryUrl = `/monthly_summary${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''}`;

        // Fetch all data in parallel
        const [
            transRes, vizRes, goalsRes, netWorthRes,
            recurringTransRes, monthlySpendingRes, analyzeRes,
            budgetRes, investRes, offersRes, forecastRes,
            budgetAlertsRes, monthlySummaryRes
        ] = await Promise.all([
            fetch(transUrl),
            fetch(vizUrl),
            fetch('/get_goals'),
            fetch('/net_worth'),
            fetch('/recurring_transactions'),
            fetch('/monthly_spending'),
            fetch('/analyze'),
            fetch('/budget'),
            fetch('/investments'),
            fetch('/offers'),
            fetch('/forecast'),
            fetch('/budget_alerts'),
            fetch(monthlySummaryUrl)
        ]);

        const trans = await transRes.json();
        const viz = await vizRes.json();
        const goals = await goalsRes.json();
        const netWorthData = await netWorthRes.json();
        const recurringTrans = await recurringTransRes.json();
        const monthlySpending = await monthlySpendingRes.json();
        const analyze = await analyzeRes.json();
        const budget = await budgetRes.json();
        const invest = await investRes.json();
        const offers = await offersRes.json();
        const forecast = await forecastRes.json();
        const budgetAlerts = await budgetAlertsRes.json();
        const monthlySummary = await monthlySummaryRes.json();

        // ✅ Monthly Summary Section
        const monthlyIncomeElement = document.getElementById('monthly-income');
        const monthlyExpensesElement = document.getElementById('monthly-expenses');
        const monthlyBalanceElement = document.getElementById('monthly-balance');
        if (monthlyIncomeElement && monthlyExpensesElement && monthlyBalanceElement) {
            monthlyIncomeElement.textContent = `₹${(monthlySummary.total_income || 0).toFixed(2)}`;
            monthlyExpensesElement.textContent = `₹${(monthlySummary.total_expenses || 0).toFixed(2)}`;
            monthlyBalanceElement.textContent = `₹${(monthlySummary.balance || 0).toFixed(2)}`;
        }

        // ✅ Monthly Spending Card
        const monthlySpendingElement = document.getElementById('monthly-spending-summary');
        if (monthlySpendingElement) {
            monthlySpendingElement.innerHTML = monthlySpending.status === 'error'
                ? 'Error loading data'
                : `Total spent this month: <strong class="text-danger">₹${(monthlySpending.total_spending || 0).toFixed(2)}</strong>.`;
        }

        // ✅ Transactions List
        if (trans.status === 'error') {
            document.getElementById('transactions-list').innerHTML = '<li>Error loading transactions</li>';
            return;
        }
        const filteredTrans = filterTransactions(trans, period, startDate, endDate);
        const transactionsList = document.getElementById('transactions-list');
        if (transactionsList) {
            transactionsList.innerHTML = filteredTrans.length > 0
                ? filteredTrans.slice(0, 5).map(t => `
                    <li>
                        <span>
                            <i class="fas ${t.type === 'income' ? 'fa-plus-circle text-success' : 'fa-minus-circle text-danger'}"></i>
                            ${t.date}: ${t.category} ₹${(t.amount || 0).toFixed(2)}
                        </span>
                        <button class="btn btn-delete" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
                    </li>`).join('')
                : '<li>No transactions found</li>';
            
            if (filteredTrans.length > 5) {
                transactionsList.innerHTML += `
                    <li class="mt-2 text-center">
                        <button class="btn btn-link btn-sm" id="view-more-trans">View More...</button>
                    </li>`;
                document.getElementById('view-more-trans')?.addEventListener('click', () => showTransactionsModal(filteredTrans));
            }
        }

        // ✅ Expense Breakdown Pie Chart
        // ✅ Expense Breakdown Pie Chart
const pieChartElement = document.getElementById('pieChart');
if (pieChartElement) {
    if (window.pieChart && typeof window.pieChart.destroy === 'function') {
        window.pieChart.destroy();
    }

    if (viz.status !== 'error' && viz.pie) {
        const pieData = viz.pie || {};
        const categories = Object.keys(pieData);
        const amounts = Object.values(pieData);

        if (categories.length > 0) {
            window.pieChart = new Chart(pieChartElement, {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56',
                            '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
                        ]
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            labels: {
                                color: document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333'
                            }
                        }
                    },
                    // 👇 Add click handler for showing transactions
                    onClick: async (evt, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const category = categories[index];

                            try {
                                const res = await fetch(`/get_transactions?category=${encodeURIComponent(category)}`);
                                const transactions = await res.json();

                                // Open modal with transactions for this category
                                showTransactionsModal(transactions, category);
                            } catch (err) {
                                console.error("Error loading transactions for category:", category, err);
                                alert("Could not load transactions for " + category);
                            }
                        }
                    }
                }
            });
        }
    }
}

        // ✅ Trend Line Chart
        // ✅ Trend Line Chart
const trendChartElement = document.getElementById('trendChart');
if (trendChartElement) {
    if (window.trendChart && typeof window.trendChart.destroy === 'function') {
        window.trendChart.destroy();
    }


    if (viz.status !== 'error' && viz.trend) {
    console.log("📊 Raw trend data from backend:", viz.trend);

        let trendLabels = [];
        let trendData = [];

        // Case 1: {labels: [...], data: [...]}
        if (viz.trend.labels && viz.trend.data) {
            trendLabels = viz.trend.labels;
            trendData = viz.trend.data;
        }
        // Case 2: array of objects [{month, amount}]
        else if (Array.isArray(viz.trend)) {
            trendLabels = viz.trend.map(item => item.month || item.label || "N/A");
            trendData = viz.trend.map(item => item.amount || item.value || 0);
        }
        // Case 3: plain object {Jan: 1200, Feb: 1500}
        else if (typeof viz.trend === 'object') {
            trendLabels = Object.keys(viz.trend);
            trendData = Object.values(viz.trend);
        }

        if (trendLabels.length > 0 && trendData.length > 0) {
            window.trendChart = new Chart(trendChartElement, {
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
        } else {
            console.warn("No valid trend data found:", viz.trend);
        }
    }
}

        // ✅ Goals Summary
        document.getElementById('goals-summary').innerHTML = goals.status === 'error'
            ? 'Error loading goals'
            : goals.goals.length > 0 ? (() => {
                const now = new Date();
                const upcomingGoals = goals.goals
                    .filter(g => new Date(g.deadline) > now && g.current_amount < g.target_amount)
                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
                if (upcomingGoals.length > 0) {
                    const mostRecentGoal = upcomingGoals[0];
                    const progress = (mostRecentGoal.current_amount / mostRecentGoal.target_amount) * 100;
                    return `
                        Your most urgent goal is <strong>${mostRecentGoal.goal_name}</strong> (Deadline: ${mostRecentGoal.deadline}).<br>
                        Progress: ₹${(mostRecentGoal.current_amount || 0).toFixed(2)} / ₹${(mostRecentGoal.target_amount || 0).toFixed(2)} (${progress.toFixed(0)}%).<br>
                        <div class="progress mt-2">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <br>Click to manage all goals.
                    `;
                } else {
                    return `You have ${goals.goals.length} goals. All goals are either met or in the past. Click to view or set a new one!`;
                }
            })() : `You have no financial goals yet. Click to add your first goal!`;

       

        // ✅ Recurring Transactions
        document.getElementById('recurring-trans-summary').innerHTML = recurringTrans.status === 'error'
            ? 'Error loading recurring transactions'
            : `You have ${(recurringTrans.recurring_transactions || []).length} recurring items.<br>Click to manage subscriptions and more.`;

        // ✅ Analysis, Budget, Investments, Offers, Forecast, Alerts
        document.getElementById('analyze').innerHTML = analyze.status === 'error'
            ? 'Error loading analysis'
            : `Potential Savings: ₹${(analyze.potential_savings || 0).toFixed(2)}<br>Click for detailed overspending analysis.`;

        document.getElementById('budget').innerHTML = budget.status === 'error'
            ? 'Error loading budget recommendations'
            : `Recommended Total: ₹${(budget.total || 0).toFixed(2)}<br>Status: ${budget.warning || 'N/A'}`;

        document.getElementById('investments').innerHTML = invest.status === 'error'
            ? 'Error loading investments'
            : `${(invest.suggestions || ['No suggestions'])[0]}<br>Click for more suggestions.`;

        document.getElementById('offers').innerHTML = offers.status === 'error'
            ? 'Error loading offers'
            : `New offer for you: ${(offers.offers || ['No offers'])[0]}<br>Click for more offers.`;

        document.getElementById('forecast').innerHTML = forecast.status === 'error'
            ? 'Error loading forecast'
            : `Next Month's Expense Forecast:<br>₹${(forecast.next_month_exp || 0).toFixed(2)}`;

        document.getElementById('budget-alerts-summary').innerHTML = budgetAlerts.status === 'error'
            ? 'Error loading alerts'
            : `You have ${(budgetAlerts.alerts || []).length} budget alert(s) this month.<br>Click for details.`;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard: ' + error.message);
    } finally {
        hideSpinner();
    }
}

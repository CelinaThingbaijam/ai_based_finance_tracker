// scripts.js
import { loadTheme, toggleTheme } from './theme.js';
import { setupTransactionForm, setupCategoryForm, setupFilterForm, setupResetFilter, setupAssetForm, setupDebtForm, setupRecurringForm } from './forms.js';
import { setupGoalsCard, setupNetWorthCard, setupRecurringTransCard, setupBudgetCard, setupAnalyzeCard, setupInvestmentsCard, setupOffersCard, setupForecastCard, setupBudgetAlertsCard, setupMonthlySummaryCard, setupGoalForm, setupTrendCard } from './modals.js';
import { loadDashboard } from './dashboard.js';
import { startOnboardingTour } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadDashboard();

    // Setup form event listeners
    setupTransactionForm();
    setupCategoryForm();
    setupFilterForm();
    setupResetFilter();
    setupAssetForm();
    setupDebtForm();
    setupRecurringForm();
    setupGoalForm();


    // Setup card event listeners
    setupGoalsCard();
    setupNetWorthCard();
    setupRecurringTransCard();
    setupBudgetCard();
    setupAnalyzeCard();
    setupInvestmentsCard();
    setupOffersCard();
    setupForecastCard();
    setupBudgetAlertsCard();
    setupMonthlySummaryCard();
    setupTrendCard(); // Add this line
    

    // Add event listener for the "Add Transaction" button
    const addTransBtn = document.getElementById('add-transaction-btn');
    if (addTransBtn) {
        addTransBtn.addEventListener('click', () => {
            const addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            addTransactionModal.show();
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Month filter functionality
    document.querySelectorAll('.month-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const month = e.target.dataset.month;
            const year = e.target.dataset.year;

            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
            
            document.getElementById('start-date').value = startDate;
            document.getElementById('end-date').value = endDate;
            document.getElementById('period').value = 'monthly';
            
            document.querySelectorAll('.month-grid a').forEach(a => a.classList.remove('active-month'));
            e.target.closest('a').classList.add('active-month');

            loadDashboard();
        });
    });

    // Sidebar Toggle
    const sidebarWrapper = document.getElementById('wrapper');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && sidebarWrapper) {
        menuToggle.addEventListener('click', () => {
            sidebarWrapper.classList.toggle('toggled');
        });
    }

    startOnboardingTour();
});
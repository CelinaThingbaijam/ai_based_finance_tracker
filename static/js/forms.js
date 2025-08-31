// forms.js
import { showSpinner, hideSpinner, filterTransactions } from './utils.js';
import { pieChart, trendChart, recurringPieChart } from './theme.js';
import { showTransactionsModal, loadNetWorth, loadRecurringTransactions, loadGoals } from './modals.js';
import { loadDashboard } from './dashboard.js';

export async function loadCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) {
        console.warn('Category select element not found');
        return;
    }
    
    try {
        const response = await fetch('/get_categories');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message);
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


export function setupTransactionForm() {
    const form = document.getElementById('trans-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('type').value;
            const category = document.getElementById('category').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const date = document.getElementById('date').value;

            if (!category || !amount || !date) {
                alert('Please fill out all fields.');
                return;
            }

            showSpinner();
            try {
                const response = await fetch('/add_transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, category, amount, date })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Transaction added!');
                    // This is the key change: call loadDashboard() to refresh all data.
                    loadDashboard();
                    form.reset();
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
                    if (modal) {
                        modal.hide();
                    }
                } else {
                    alert('Error adding transaction: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding transaction:', error);
                alert('Error adding transaction: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
    loadCategories();
}

export function setupCategoryForm() {
    // This is a placeholder as the HTML for the category form is not provided
    // but the function needs to exist to prevent the import error.
    console.log("setupCategoryForm initialized.");
}


export function setupFilterForm() {
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadDashboard();
        });
    }
}

export function setupResetFilter() {
    const resetFilterBtn = document.getElementById('reset-filter');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            document.getElementById('start-date').value = '';
            document.getElementById('end-date').value = '';
            document.getElementById('period').value = 'monthly';
            loadDashboard();
        });
    }
}

export function setupAssetForm() {
    const form = document.getElementById('add-asset-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('asset-name').value;
            const value = parseFloat(document.getElementById('asset-value').value);

            if (!name || isNaN(value) || value <= 0) {
                alert('Please enter a valid asset name and value.');
                return;
            }

            showSpinner();
            try {
                const response = await fetch('/add_asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, value })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Asset added!');
                    loadNetWorth(); 
                    form.reset();
                } else {
                    alert('Error adding asset: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding asset:', error);
                alert('Error adding asset: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupDebtForm() {
    const form = document.getElementById('add-debt-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('debt-name').value;
            const amount = parseFloat(document.getElementById('debt-amount').value);

            if (!name || isNaN(amount) || amount <= 0) {
                alert('Please enter a valid debt name and amount.');
                return;
            }

            showSpinner();
            try {
                const response = await fetch('/add_debt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, amount })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Debt added!');
                    loadNetWorth(); 
                    form.reset();
                } else {
                    alert('Error adding debt: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding debt:', error);
                alert('Error adding debt: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}

export function setupRecurringForm() {
    const form = document.getElementById('add-recurring-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('recurring-type').value;
            const category = document.getElementById('recurring-category').value;
            const amount = parseFloat(document.getElementById('recurring-amount').value);
            const frequency = document.getElementById('recurring-frequency').value;

            if (!category || !amount || !frequency) {
                alert('Please fill out all fields.');
                return;
            }

            showSpinner();
            try {
                const response = await fetch('/add_recurring', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, category, amount, frequency })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert('Recurring transaction added!');
                    loadRecurringTransactions();
                    form.reset();
                } else {
                    alert('Error adding recurring transaction: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding recurring transaction:', error);
                alert('Error adding recurring transaction: ' + error.message);
            } finally {
                hideSpinner();
            }
        });
    }
}
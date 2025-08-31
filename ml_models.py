import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

def prepare_data(transactions):
    try:
        # Correctly expect 7 columns now that goal_id is part of the schema
        df = pd.DataFrame(transactions, columns=['id', 'user_id', 'type', 'category', 'amount', 'date', 'goal_id'])
        # Ensure 'date' is in datetime format
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        if df['date'].isna().any():
            logger.warning("Some transaction dates could not be parsed and will be excluded")
            df = df.dropna(subset=['date'])
        return df
    except Exception as e:
        logger.error(f"Error preparing data: {str(e)}")
        raise

def detect_overspending(df):
    try:
        category_avgs = df[df['type'] == 'expense'].groupby('category')['amount'].mean()
        recent = df[df['type'] == 'expense'].sort_values('date').tail(30)
        overspend = {}
        for cat in category_avgs.index:
            cat_spend = recent[recent['category'] == cat]['amount'].sum()
            avg = category_avgs[cat] * (len(recent) / 30)
            if cat_spend > avg * 1.2:
                overspend[cat] = round(cat_spend - avg, 2)
        savings_potential = round(sum(overspend.values()), 2)
        return {'overspend': overspend, 'potential_savings': savings_potential}
    except Exception as e:
        logger.error(f"Error in detect_overspending: {str(e)}")
        return {'status': 'error', 'message': str(e)}

# ml_models.py
def recommend_budget(df):
    try:
        from database import get_budgets  # Import here to avoid circular imports
        monthly_exp = df[df['type'] == 'expense'].groupby(pd.Grouper(key='date', freq='ME'))['amount'].sum().mean()
        income_avg = df[df['type'] == 'income']['amount'].mean() if not df[df['type'] == 'income'].empty else 0

        if pd.isna(monthly_exp) or monthly_exp == 0:
            monthly_exp = 1000.0
        if pd.isna(income_avg):
            income_avg = 0

        total_budget = round(income_avg * 0.8 if income_avg > 0 else monthly_exp * 1.1, 2)
        if total_budget <= 0:
            total_budget = 1000.0

        category_totals = df[df['type'] == 'expense'].groupby('category')['amount'].sum()
        total_expenses = category_totals.sum() if not category_totals.empty else 0
        budgets = {}
        savings_tips = {}

        # Get saved budgets from database
        saved_budgets = get_budgets(df['user_id'].iloc[0] if not df.empty else 0)
        
        default_categories = ['Food', 'Transport', 'Utilities', 'Other'] if total_expenses == 0 else category_totals.index

        for cat in default_categories:
            if cat in saved_budgets:
                budgets[cat] = saved_budgets[cat]['amount']
            elif total_expenses == 0:
                budgets[cat] = round(total_budget / len(default_categories), 2)
            else:
                proportion = category_totals.get(cat, 0) / total_expenses
                budget = min(round(total_budget * proportion, 2), total_budget * 0.3)
                budgets[cat] = max(budget, 10.0)

            recent_spend = df[df['type'] == 'expense'][df['category'] == cat]['amount'].tail(30).sum()
            savings_tips[cat] = (f"Reduce {cat} spending by 10% to save ₹{round(recent_spend * 0.1, 2)}"
                                if recent_spend > budgets[cat] else f"Maintain {cat} spending within budget")

        warning = "Likely to exceed budget!" if monthly_exp > total_budget else "Spending within budget"
        
        return {
            'total': total_budget,
            'budgets': budgets,
            'savings_tips': savings_tips,
            'warning': warning
        }
    except Exception as e:
        logger.error(f"Error in recommend_budget: {str(e)}")
        return {'status': 'error', 'message': str(e)}

def investment_suggestions(df):
    try:
        income = df[df['type'] == 'income']['amount'].sum()
        expenses = df[df['type'] == 'expense']['amount'].sum()
        savings_rate = (income - expenses) / income if income > 0 else 0
        if savings_rate > 0.2:
            suggestions = ["Invest in Mutual Funds/SIPs (e.g., HDFC Sensex)", "Consider fixed deposits for stable returns"]
        else:
            suggestions = ["Build an emergency fund (3-6 months of expenses)", "Start with low-risk bonds"]
        return suggestions
    except Exception as e:
        logger.error(f"Error in investment_suggestions: {str(e)}")
        return ['Error generating suggestions']

def get_offers(df):
    try:
        top_cat = df[df['type'] == 'expense'].groupby('category')['amount'].sum().idxmax() if not df[df['type'] == 'expense'].empty else 'Other'
        offers = {
            'Food': '10% off on groceries at LocalMart',
            'Travel': '5% cashback on travel bookings',
            'Shopping': '15% discount on fashion outlets',
            'Other': 'General cashback on credit card spending'
        }
        return [offers.get(top_cat, 'No specific offers available')]
    except Exception as e:
        logger.error(f"Error in get_offers: {str(e)}")
        return ['Error fetching offers']

def forecast_expenses(df):
    try:
        expenses = df[df['type'] == 'expense'].groupby(pd.Grouper(key='date', freq='ME'))['amount'].sum()
        if len(expenses) >= 3:
            from statsmodels.tsa.arima.model import ARIMA
            model = ARIMA(expenses, order=(1,1,1))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=1)[0]
            return {'next_month_exp': round(forecast, 2)}
        return {'next_month_exp': round(expenses.mean(), 2) if not expenses.empty else 0}
    except Exception as e:
        logger.error(f"Error in forecast_expenses: {str(e)}")
        return {'status': 'error', 'message': str(e)}

def get_budget_alerts(df, recommended_budgets):
    """
    Compares current monthly spending to recommended budgets and generates alerts.
    """
    try:
        # Get spending for the current month
        current_month = pd.Timestamp.now().to_period('M')
        current_month_spending = df[(df['type'] == 'expense') & (df['date'].dt.to_period('M') == current_month)].groupby('category')['amount'].sum()
        
        alerts = []
        # Check for each category if spending exceeds the recommended budget
        for category, budgeted_amount in recommended_budgets['budgets'].items():
            spent_amount = current_month_spending.get(category, 0)
            if spent_amount > budgeted_amount:
                over_amount = spent_amount - budgeted_amount
                alerts.append({
                    'category': category,
                    'spent': round(spent_amount, 2),
                    'budget': round(budgeted_amount, 2),
                    'over': round(over_amount, 2),
                    'message': f"You have overspent by ₹{round(over_amount, 2)} in {category} this month. Consider cutting back!"
                })
        
        if not alerts:
            alerts.append({'message': "Great job! You're currently on track with your budget."})

        return {'alerts': alerts}
    except Exception as e:
        logger.error(f"Error in get_budget_alerts: {str(e)}")
        return {'status': 'error', 'message': str(e)}

def calculate_net_worth(assets, debts):
    """
    Calculates net worth from a list of assets and debts.
    """
    try:
        total_assets = sum(a['current_value'] for a in assets)
        total_debts = sum(d['amount_owed'] for d in debts)
        net_worth = total_assets - total_debts
        return round(net_worth, 2)
    except Exception as e:
        logger.error(f"Error calculating net worth: {str(e)}")
        return 0
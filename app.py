# app.py

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
import database
import ml_models
import logging
import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
app.config['JSON_SORT_KEYS'] = False

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return database.get_user_by_id(user_id)

database.init_db()

@app.route('/')
@login_required
def home():
    return render_template('index.html', user=current_user, now=datetime.datetime.now())

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = generate_password_hash(request.form['password'])
        if database.add_user(username, password):
            flash('Registered successfully! Please log in.')
            return redirect(url_for('login'))
        else:
            flash('Username already exists.')
    return render_template('register.html', now=datetime.datetime.now())

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user_data = database.get_user_by_username(username)
        if user_data and check_password_hash(user_data['password'], password):
            user = database.User(user_data['id'], username)
            login_user(user)
            return redirect(url_for('home'))
        else:
            flash('Invalid credentials.')
    return render_template('login.html', now=datetime.datetime.now())

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/add_transaction', methods=['POST'])
@login_required
def add_trans():
    try:
        data = request.json
        logger.debug(f"Received transaction data: {data}")
        required_fields = ['type', 'category', 'amount', 'date']
        if not all(field in data for field in required_fields):
            logger.error("Missing required fields in transaction data")
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        goal_id_to_contribute = 0
        if data['type'] == 'income' and data['category'] == 'Savings':
            goals = database.get_goals(current_user.id)
            now = datetime.date.today()
            upcoming_goals = [g for g in goals if g['deadline'] and datetime.datetime.strptime(g['deadline'], '%Y-%m-%d').date() > now and g['current_amount'] < g['target_amount']]
            if upcoming_goals:
                upcoming_goals.sort(key=lambda x: x['deadline'])
                goal_id_to_contribute = upcoming_goals[0]['id']
        
        if database.add_transaction(current_user.id, data['type'], data['category'], data['amount'], data['date'], goal_id_to_contribute):
            if goal_id_to_contribute > 0:
                database.update_goal_progress(current_user.id, goal_id_to_contribute, data['amount'])
            flash('Transaction added successfully!')
            return jsonify({'status': 'success'})
        else:
            flash('Error adding transaction.')
            return jsonify({'status': 'error', 'message': 'Failed to add transaction'}), 500
    except Exception as e:
        logger.error(f"Error adding transaction: {str(e)}")
        flash('An unexpected error occurred.')
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/delete_transaction', methods=['POST'])
@login_required
def delete_trans():
    try:
        data = request.json
        logger.debug(f"Received delete transaction data: {data}")
        if 'id' not in data:
            logger.error("Missing transaction ID")
            return jsonify({'status': 'error', 'message': 'Missing transaction ID'}), 400
        transaction_id = data['id']
        if database.delete_transaction(current_user.id, transaction_id):
            logger.info(f"Transaction deleted: id={transaction_id}, user_id={current_user.id}")
            return jsonify({'status': 'success'})
        else:
            logger.error(f"Transaction not found or unauthorized: id={transaction_id}, user_id={current_user.id}")
            return jsonify({'status': 'error', 'message': 'Transaction not found or unauthorized'}), 404
    except Exception as e:
        logger.error(f"Error deleting transaction: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_category', methods=['POST'])
@login_required
def add_category():
    try:
        data = request.json
        logger.debug(f"Received category data: {data}")
        if 'category' not in data or not data['category'].strip():
            logger.error("Missing or empty category name")
            return jsonify({'status': 'error', 'message': 'Category name is required'}), 400
        category = data['category'].strip()
        if database.add_category(current_user.id, category):
            logger.info(f"Category added: {category} for user {current_user.id}")
            return jsonify({'status': 'success', 'category': category})
        else:
            logger.warning(f"Category already exists: {category}")
            return jsonify({'status': 'error', 'message': 'Category already exists'}), 400
    except Exception as e:
        logger.error(f"Error adding category: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_categories')
@login_required
def get_categories():
    try:
        categories = database.get_categories(current_user.id)
        logger.debug(f"Fetched {len(categories)} categories for user {current_user.id}")
        return jsonify({'categories': categories})
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_transactions')
@login_required
def get_trans():
    try:
        start_date = request.args.get('start_date') or None
        end_date = request.args.get('end_date') or None
        category = request.args.get('category') or None

        logger.debug(f"Fetching transactions with start_date={start_date}, end_date={end_date}, category={category}")

        trans = database.get_transactions(current_user.id, start_date, end_date, category)

        logger.debug(f"Fetched {len(trans)} transactions for user {current_user.id}")
        
        return jsonify([
            {
                'id': t['id'],
                'type': t['type'],
                'category': t['category'],
                'amount': t['amount'],
                'date': t['date'],
                'goal_id': t['goal_id']
            } for t in trans
        ])
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/visualize/<period>')
@login_required
def visualize(period):
    try:
        start_date = request.args.get('start_date') or None
        end_date = request.args.get('end_date') or None
        logger.debug(f"Visualize: period={period}, start_date={start_date}, end_date={end_date}")
        trans = database.get_transactions(current_user.id, start_date, end_date)
        logger.debug(f"Visualize: Fetched {len(trans)} transactions")
        df = ml_models.prepare_data(trans)
        
        try:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            if df['date'].isna().any():
                logger.warning("Some transaction dates could not be parsed and will be excluded")
                df = df.dropna(subset=['date'])
        except Exception as e:
            logger.error(f"Error converting dates to datetime: {str(e)}")
            return jsonify({'status': 'error', 'message': f"Date conversion error: {str(e)}"}), 500

        if period in ['daily', 'weekly', 'monthly']:
            group_freq = {'daily': 'D', 'weekly': 'W', 'monthly': 'ME'}[period]
            # This is the corrected line to filter for expenses
            pie_data = df[df['type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
            trend_series = df.groupby(pd.Grouper(key='date', freq=group_freq))['amount'].sum()
            trend_data = {str(date): amount for date, amount in trend_series.to_dict().items()}
            logger.debug(f"Pie data: {pie_data}, Trend data: {trend_data}")
            return jsonify({'pie': pie_data, 'trend': trend_data})
        logger.error(f"Invalid period: {period}")
        return jsonify({'status': 'error', 'message': 'Invalid period'}), 400
    except Exception as e:
        logger.error(f"Error in visualize endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_goal', methods=['POST'])
@login_required
def add_goal():
    try:
        data = request.json
        logger.debug(f"Received goal data: {data}")
        required_fields = ['goal_name', 'target_amount', 'deadline']
        if not all(field in data for field in required_fields):
            logger.error("Missing required fields in goal data")
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        if database.add_goal(current_user.id, data['goal_name'], data['target_amount'], data['deadline']):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Error adding goal'}), 500
    except Exception as e:
        logger.error(f"Error adding goal: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_goals')
@login_required
def get_goals():
    try:
        goals = database.get_goals(current_user.id)
        return jsonify({'goals': goals})
    except Exception as e:
        logger.error(f"Error fetching goals: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/update_goal_progress', methods=['POST'])
@login_required
def update_goal_progress():
    try:
        data = request.json
        logger.debug(f"Received goal progress data: {data}")
        if 'id' not in data or 'current_amount' not in data:
            logger.error("Missing required fields in goal progress data")
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        if database.update_goal_progress(current_user.id, data['id'], data['current_amount']):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Error updating goal progress'}), 500
    except Exception as e:
        logger.error(f"Error updating goal progress: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/delete_goal', methods=['POST'])
@login_required
def delete_goal_route():
    try:
        data = request.json
        if 'id' not in data:
            return jsonify({'status': 'error', 'message': 'Missing goal ID'}), 400
        if database.delete_goal(current_user.id, data['id']):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Goal not found or unauthorized'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/update_goal', methods=['POST'])
@login_required
def update_goal_route():
    try:
        data = request.json
        required_fields = ['id', 'goal_name', 'target_amount', 'deadline']
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        if database.update_goal(current_user.id, data['id'], data['goal_name'], data['target_amount'], data['deadline']):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Goal not found or unauthorized'}), 404
    except Exception as e:
        logger.error(f"Error updating goal: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/analyze')
@login_required
def analyze():
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        overspend = ml_models.detect_overspending(df)
        logger.debug(f"Analyze: {overspend}")
        return jsonify(overspend)
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/monthly_spending')
@login_required
def monthly_spending():
    try:
        start_of_month = datetime.date.today().replace(day=1).strftime('%Y-%m-%d')
        today = datetime.date.today().strftime('%Y-%m-%d')
        trans = database.get_transactions(current_user.id, start_date=start_of_month, end_date=today)
        df = ml_models.prepare_data(trans)
        total_spending = df[df['type'] == 'expense']['amount'].sum() if not df.empty else 0
        return jsonify({'total_spending': float(total_spending)})
    except Exception as e:
        logger.error(f"Error in monthly_spending endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# app.py

# ... (all existing imports and routes) ...

@app.route('/monthly_summary')
@login_required
def monthly_summary():
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        if not start_date_str or not end_date_str:
            # Default to current month if dates are not provided
            today = datetime.date.today()
            start_date_str = today.replace(day=1).strftime('%Y-%m-%d')
            end_date_str = today.strftime('%Y-%m-%d')

        trans = database.get_transactions(current_user.id, start_date=start_date_str, end_date=end_date_str)
        df = ml_models.prepare_data(trans)

        total_income = df[df['type'] == 'income']['amount'].sum() if 'income' in df['type'].unique() else 0
        total_expenses = df[df['type'] == 'expense']['amount'].sum() if 'expense' in df['type'].unique() else 0
        balance = total_income - total_expenses
        
        return jsonify({
            'total_income': float(total_income),
            'total_expenses': float(total_expenses),
            'balance': float(balance)
        })
    except Exception as e:
        logger.error(f"Error in monthly_summary endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/monthly_comparison')
@login_required
def monthly_comparison():
    try:
        today = datetime.date.today()
        
        # Current month
        current_month_start = today.replace(day=1)
        current_month_end = today
        current_trans = database.get_transactions(current_user.id, current_month_start.strftime('%Y-%m-%d'), current_month_end.strftime('%Y-%m-%d'))
        current_df = ml_models.prepare_data(current_trans)
        current_expenses_by_cat = current_df[current_df['type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
        current_month_exp = current_df[current_df['type'] == 'expense']['amount'].sum()

        # Previous month
        prev_month_end = current_month_start - datetime.timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        prev_trans = database.get_transactions(current_user.id, prev_month_start.strftime('%Y-%m-%d'), prev_month_end.strftime('%Y-%m-%d'))
        prev_df = ml_models.prepare_data(prev_trans)
        prev_expenses_by_cat = prev_df[prev_df['type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
        prev_month_exp = prev_df[prev_df['type'] == 'expense']['amount'].sum()

        return jsonify({
            'current_month': {
                'total_expenses': float(current_month_exp) if not pd.isna(current_month_exp) else 0,
                'breakdown': {k: float(v) for k, v in current_expenses_by_cat.items()}
            },
            'previous_month': {
                'total_expenses': float(prev_month_exp) if not pd.isna(prev_month_exp) else 0,
                'breakdown': {k: float(v) for k, v in prev_expenses_by_cat.items()}
            }
        })
    except Exception as e:
        logger.error(f"Error in monthly_comparison endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/budget')
@login_required
def budget():
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        rec = ml_models.recommend_budget(df)
        today = datetime.date.today()
        start_of_month = today.replace(day=1)
        current_trans = database.get_transactions(
            current_user.id,
            start_date=start_of_month.strftime('%Y-%m-%d'),
            end_date=today.strftime('%Y-%m-%d')
        )
        current_df = ml_models.prepare_data(current_trans)
        spending = current_df[current_df['type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
        spending = {k: float(v) for k, v in spending.items()}
        for cat in rec.get('budgets', {}):
            if cat not in spending:
                spending[cat] = 0.0
        rec['spending'] = spending
        logger.debug(f"Budget: {rec}")
        return jsonify(rec)
    except Exception as e:
        logger.error(f"Error in budget endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/update_budget', methods=['POST'])
@login_required
def update_budget():
    try:
        data = request.json
        logger.debug(f"Received budget update data: {data}")
        budgets = data.get('budgets', {})
        if not budgets:
            logger.error("No budget data provided")
            return jsonify({'status': 'error', 'message': 'No budget data provided'}), 400
        for category, amount in budgets.items():
            if not isinstance(amount, (int, float)) or amount < 0:
                logger.error(f"Invalid budget amount for {category}: {amount}")
                return jsonify({'status': 'error', 'message': f"Invalid budget amount for {category}"}), 400
            database.update_budget(current_user.id, category, float(amount))
        logger.info(f"Budgets updated for user {current_user.id}")
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Error updating budgets: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/investments')
@login_required
def investments():
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        suggestions = ml_models.investment_suggestions(df)
        logger.debug(f"Investments: {suggestions}")
        return jsonify({'suggestions': suggestions})
    except Exception as e:
        logger.error(f"Error in investments endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/offers')
@login_required
def offers():
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        offers = ml_models.get_offers(df)
        logger.debug(f"Offers: {offers}")
        return jsonify({'offers': offers})
    except Exception as e:
        logger.error(f"Error in offers endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/forecast')
@login_required
def forecast():
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        forecast = ml_models.forecast_expenses(df)
        logger.debug(f"Forecast: {forecast}")
        return jsonify(forecast)
    except Exception as e:
        logger.error(f"Error in forecast endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# app.py

@app.route('/today_spending')
@login_required
def today_spending():
    """
    Renders a page with a breakdown of spending for the current day.
    """
    try:
        today = datetime.date.today().strftime('%Y-%m-%d')
        transactions_data = database.get_transactions(current_user.id, start_date=today, end_date=today)
        
        daily_breakdown = {}
        for t in transactions_data:
            if t['type'] == 'expense': # Use dictionary key 'type' instead of tuple index 2
                category = t['category'] # Use dictionary key 'category' instead of tuple index 3
                amount = t['amount'] # Use dictionary key 'amount' instead of tuple index 4
                daily_breakdown[category] = daily_breakdown.get(category, 0) + amount
        
        # FIX: Ensure all values are standard floats for JSON serialization
        daily_breakdown = {k: float(v) for k, v in daily_breakdown.items()}

        total_daily_spending = sum(daily_breakdown.values())

        # FIX: Ensure daily_transactions is a list of dictionaries, not a DataFrame
        daily_transactions = transactions_data 
        
        return render_template('today_spending.html', 
                               daily_breakdown=daily_breakdown,
                               daily_transactions=daily_transactions,
                               total_daily_spending=total_daily_spending,
                               now=datetime.datetime.now())
    except Exception as e:
        logger.error(f"Error fetching today's spending: {str(e)}")
        return f"An error occurred: {e}", 500

@app.route('/budget_alerts')
@login_required
def get_budget_alerts_route():
    """
    API endpoint to get budget alerts.
    """
    try:
        trans = database.get_transactions(current_user.id)
        df = ml_models.prepare_data(trans)
        
        recommended_budgets = ml_models.recommend_budget(df)
        
        alerts = ml_models.get_budget_alerts(df, recommended_budgets)
        
        logger.debug(f"Budget Alerts: {alerts}")
        return jsonify(alerts)
    except Exception as e:
        logger.error(f"Error in budget_alerts endpoint: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/net_worth')
@login_required
def get_net_worth():
    try:
        assets = database.get_assets(current_user.id)
        debts = database.get_debts(current_user.id)
        net_worth_value = ml_models.calculate_net_worth(assets, debts)
        return jsonify({'net_worth': net_worth_value, 'assets': assets, 'debts': debts})
    except Exception as e:
        logger.error(f"Error calculating net worth: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e), 'net_worth': 0, 'assets': [], 'debts': []}), 500

# Fix the asset and debt routes to match the front-end requests
@app.route('/add_asset', methods=['POST'])
@login_required
def add_asset_route():
    try:
        data = request.json
        if not all(k in data for k in ['name', 'value']):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        if database.add_asset(current_user.id, data['name'], 'Other', data['value']):  # 'Other' as a default type
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to add asset'}), 500
    except Exception as e:
        logger.error(f"Error in add asset route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_debt', methods=['POST'])
@login_required
def add_debt_route():
    try:
        data = request.json
        if not all(k in data for k in ['name', 'amount']):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        if database.add_debt(current_user.id, data['name'], data['amount'], 0, 0, None): # Default values for missing fields
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to add debt'}), 500
    except Exception as e:
        logger.error(f"Error in add debt route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/pay_debt', methods=['POST'])
@login_required
def pay_debt_route():
    try:
        data = request.json
        required_fields = ['id', 'amount']
        if not all(k in data for k in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400

        debt_id = data['id']
        amount = data['amount']

        if database.pay_off_debt(current_user.id, debt_id, amount):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Failed to process payment'}), 500
    except Exception as e:
        logger.error(f"Error in pay_debt route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/debts/<int:debt_id>', methods=['DELETE'])
@login_required
def delete_debt_route(debt_id):
    try:
        if database.delete_debt(current_user.id, debt_id):
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Debt not found or unauthorized'}), 404
    except Exception as e:
        logger.error(f"Error in delete debt route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/add_recurring', methods=['POST'])
@login_required
def add_recurring_route():
    try:
        data = request.json
        if not all(k in data for k in ['type', 'category', 'amount', 'frequency']):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        # Add a default start_date since it's not provided by the front-end
        start_date = datetime.date.today().strftime('%Y-%m-%d')
        if database.add_recurring_transaction(current_user.id, data['type'], data['category'], data['amount'], start_date, data['frequency']):
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to add recurring transaction'}), 500
    except Exception as e:
        logger.error(f"Error in add recurring route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/recurring_transactions', methods=['GET'])
@login_required
def get_recurring_transactions_route():
    try:
        recurring_trans = database.get_recurring_transactions(current_user.id)
        return jsonify({'recurring_transactions': recurring_trans})
    except Exception as e:
        logger.error(f"Error in recurring transactions route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e), 'recurring_transactions': []}), 500


@app.route('/recurring_transactions/<int:trans_id>', methods=['DELETE'])
@login_required
def delete_recurring_transaction_route(trans_id):
    try:
        if database.delete_recurring_transaction(current_user.id, trans_id):
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Recurring transaction not found or unauthorized'}), 404
    except Exception as e:
        logger.error(f"Error in delete recurring transaction route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/assets', methods=['GET'])
@login_required
def get_assets_route():
    try:
        assets = database.get_assets(current_user.id)
        return jsonify({'assets': assets})
    except Exception as e:
        logger.error(f"Error in get assets route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e), 'assets': []}), 500

@app.route('/assets/<int:asset_id>', methods=['DELETE'])
@login_required
def delete_asset_route(asset_id):
    try:
        if database.delete_asset(current_user.id, asset_id):
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Asset not found or unauthorized'}), 404
    except Exception as e:
        logger.error(f"Error in delete asset route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/recurring_viz_data')
@login_required
def recurring_viz_data():
    try:
        recurring_trans = database.get_recurring_transactions(current_user.id)
        expense_data = [t for t in recurring_trans if t['type'] == 'expense']
        
        from collections import defaultdict
        category_breakdown = defaultdict(float)
        for t in expense_data:
            category_breakdown[t['category']] += t['amount']
            
        return jsonify({'breakdown': category_breakdown})
    except Exception as e:
        logger.error(f"Error fetching recurring visualization data: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)
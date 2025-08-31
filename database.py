import sqlite3
import pandas as pd
from flask_login import UserMixin
import logging

logger = logging.getLogger(__name__)

class User(UserMixin):
    def __init__(self, id, username):
        self.id = id
        self.username = username

# database.py
def init_db():
    try:
        conn = sqlite3.connect('finance.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, category TEXT, amount REAL, date DATE, goal_id INTEGER DEFAULT 0
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY, user_id INTEGER, category TEXT UNIQUE
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY, user_id INTEGER, goal_name TEXT, target_amount REAL, current_amount REAL, deadline DATE
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS debts (
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, amount_owed REAL, interest_rate REAL, min_payment REAL, due_date DATE
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS recurring_transactions (
            id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, category TEXT, amount REAL, start_date DATE, frequency TEXT
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, type TEXT, current_value REAL
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS budgets (
            user_id INTEGER, category TEXT, amount REAL, alert_enabled BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (user_id, category),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )''')
        # Insert default categories
        default_categories = ['Food', 'Travel', 'Salary', 'Rent', 'Utilities', 'Shopping', 'Other', 'Savings']
        for cat in default_categories:
            c.execute("INSERT OR IGNORE INTO categories (user_id, category) VALUES (?, ?)", (0, cat))
        conn.commit()
        logger.info("Database initialized successfully with new tables")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
    finally:
        conn.close()

def add_user(username, password):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        logger.info(f"User added: {username}")
        return True
    except sqlite3.IntegrityError:
        logger.warning(f"Username already exists: {username}")
        return False
    except Exception as e:
        logger.error(f"Error adding user {username}: {str(e)}")
        return False
    finally:
        conn.close()

def get_user_by_username(username):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, username, password FROM users WHERE username = ?", (username,))
        user = c.fetchone()
        if user:
            logger.debug(f"User found: {username}")
            return {'id': user[0], 'username': user[1], 'password': user[2]}
        logger.debug(f"User not found: {username}")
        return None
    except Exception as e:
        logger.error(f"Error fetching user {username}: {str(e)}")
        return None
    finally:
        conn.close()

def get_user_by_id(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
        if user:
            logger.debug(f"User found by ID: {user_id}")
            return User(user[0], user[1])
        logger.debug(f"User not found by ID: {user_id}")
        return None
    except Exception as e:
        logger.error(f"Error fetching user by ID {user_id}: {str(e)}")
        return None
    finally:
        conn.close()

def add_transaction(user_id, trans_type, category, amount, date, goal_id=0):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO transactions (user_id, type, category, amount, date, goal_id) VALUES (?, ?, ?, ?, ?, ?)",
                  (user_id, trans_type, category, amount, date, goal_id))
        conn.commit()
        logger.info(f"Transaction added: user_id={user_id}, type={trans_type}, category={category}, amount={amount}, date={date}, goal_id={goal_id}")
        return True
    except Exception as e:
        logger.error(f"Error adding transaction for user_id {user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def delete_transaction(user_id, transaction_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (transaction_id, user_id))
        if c.rowcount == 0:
            logger.warning(f"No transaction found for id={transaction_id}, user_id={user_id}")
            return False
        conn.commit()
        logger.info(f"Transaction deleted: id={transaction_id}, user_id={user_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting transaction id={transaction_id} for user_id={user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def add_category(user_id, category):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT OR IGNORE INTO categories (user_id, category) VALUES (?, ?)", (user_id, category))
        if c.rowcount == 0:
            logger.warning(f"Category already exists: {category} for user_id={user_id}")
            return False
        conn.commit()
        logger.info(f"Category added: {category} for user_id={user_id}")
        return True
    except Exception as e:
        logger.error(f"Error adding category {category} for user_id={user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def get_categories(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT category FROM categories WHERE user_id = ? OR user_id = 0", (user_id,))
        categories = [row[0] for row in c.fetchall()]
        logger.debug(f"Fetched categories: {categories} for user_id={user_id}")
        return categories
    except Exception as e:
        logger.error(f"Error fetching categories for user_id={user_id}: {str(e)}")
        return ['Food', 'Travel', 'Salary', 'Rent', 'Utilities', 'Shopping', 'Other']
    finally:
        conn.close()

def get_transactions(user_id, start_date=None, end_date=None, category=None):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        query = """SELECT id, user_id, type, category, amount, date, goal_id 
                   FROM transactions 
                   WHERE user_id = ?"""
        params = [user_id]

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        if category:
            query += " AND category = ?"
            params.append(category)

        c.execute(query, params)
        transactions = c.fetchall()
        return [
            {
                'id': t[0],
                'user_id': t[1],
                'type': t[2],
                'category': t[3],
                'amount': t[4],
                'date': t[5],
                'goal_id': t[6]
            }
            for t in transactions
        ]
    finally:
        conn.close()


def add_goal(user_id, goal_name, target_amount, deadline):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO goals (user_id, goal_name, target_amount, current_amount, deadline) VALUES (?, ?, ?, 0, ?)",
                  (user_id, goal_name, target_amount, deadline))
        conn.commit()
        logger.info(f"Goal added: {goal_name} for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error adding goal {goal_name} for user {user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def get_goals(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, goal_name, target_amount, current_amount, deadline FROM goals WHERE user_id = ?", (user_id,))
        goals = c.fetchall()
        logger.debug(f"Fetched {len(goals)} goals for user {user_id}")
        return [{'id': g[0], 'goal_name': g[1], 'target_amount': g[2], 'current_amount': g[3], 'deadline': g[4]} for g in goals]
    except Exception as e:
        logger.error(f"Error fetching goals for user {user_id}: {str(e)}")
        return []
    finally:
        conn.close()

def update_goal_progress(user_id, goal_id, amount):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT current_amount FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
        current_amount = c.fetchone()
        if not current_amount:
            logger.warning(f"Goal not found for id={goal_id}, user_id={user_id}")
            return False
        
        new_amount = current_amount[0] + amount
        
        c.execute("UPDATE goals SET current_amount = ? WHERE id = ? AND user_id = ?", (new_amount, goal_id, user_id))
        conn.commit()
        logger.info(f"Goal progress updated for goal {goal_id} for user {user_id}. New amount: {new_amount}")
        return True
    except Exception as e:
        logger.error(f"Error updating goal progress for goal {goal_id} for user {user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def delete_goal(user_id, goal_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
        if c.rowcount == 0:
            logger.warning(f"No goal found for id={goal_id}, user_id={user_id}")
            return False
        conn.commit()
        logger.info(f"Goal deleted: id={goal_id}, user_id={user_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting goal id={goal_id} for user_id={user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def update_goal(user_id, goal_id, goal_name, target_amount, deadline):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("UPDATE goals SET goal_name = ?, target_amount = ?, deadline = ? WHERE id = ? AND user_id = ?",
                  (goal_name, target_amount, deadline, goal_id, user_id))
        if c.rowcount == 0:
            logger.warning(f"No goal found or updated for id={goal_id}, user_id={user_id}")
            return False
        conn.commit()
        logger.info(f"Goal updated: id={goal_id} for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error updating goal id={goal_id} for user {user_id}: {str(e)}")
        return False
    finally:
        conn.close()
        
def add_debt(user_id, name, amount_owed, interest_rate, min_payment, due_date):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO debts (user_id, name, amount_owed, interest_rate, min_payment, due_date) VALUES (?, ?, ?, ?, ?, ?)",
                  (user_id, name, amount_owed, interest_rate, min_payment, due_date))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding debt: {str(e)}")
        return False
    finally:
        conn.close()

def get_debts(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, amount_owed, interest_rate, min_payment, due_date FROM debts WHERE user_id = ?", (user_id,))
        debts = c.fetchall()
        return [{'id': d[0], 'name': d[1], 'amount_owed': d[2], 'interest_rate': d[3], 'min_payment': d[4], 'due_date': d[5]} for d in debts]
    except Exception as e:
        logger.error(f"Error fetching debts: {str(e)}")
        return []
    finally:
        conn.close()

def delete_debt(user_id, debt_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("DELETE FROM debts WHERE id = ? AND user_id = ?", (debt_id, user_id))
        if c.rowcount == 0:
            return False
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting debt: {str(e)}")
        return False
    finally:
        conn.close()

def pay_off_debt(user_id, debt_id, amount):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT amount_owed FROM debts WHERE id = ? AND user_id = ?", (debt_id, user_id))
        result = c.fetchone()
        if not result:
            logger.warning(f"Debt not found for id={debt_id}, user_id={user_id}")
            return False
        
        current_amount_owed = result[0]
        new_amount_owed = max(0, current_amount_owed - amount)
        
        c.execute("UPDATE debts SET amount_owed = ? WHERE id = ? AND user_id = ?", (new_amount_owed, debt_id, user_id))
        conn.commit()
        logger.info(f"Payment of {amount} made on debt {debt_id} for user {user_id}. New balance: {new_amount_owed}")
        return True
    except Exception as e:
        logger.error(f"Error making payment on debt {debt_id} for user {user_id}: {str(e)}")
        return False
    finally:
        conn.close()

def add_recurring_transaction(user_id, trans_type, category, amount, start_date, frequency):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO recurring_transactions (user_id, type, category, amount, start_date, frequency) VALUES (?, ?, ?, ?, ?, ?)",
                  (user_id, trans_type, category, amount, start_date, frequency))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding recurring transaction: {str(e)}")
        return False
    finally:
        conn.close()

def get_recurring_transactions(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, type, category, amount, start_date, frequency FROM recurring_transactions WHERE user_id = ?", (user_id,))
        recurring_trans = c.fetchall()
        return [{'id': t[0], 'type': t[1], 'category': t[2], 'amount': t[3], 'start_date': t[4], 'frequency': t[5]} for t in recurring_trans]
    except Exception as e:
        logger.error(f"Error fetching recurring transactions: {str(e)}")
        return []
    finally:
        conn.close()

def delete_recurring_transaction(user_id, trans_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?", (trans_id, user_id))
        if c.rowcount == 0:
            return False
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting recurring transaction: {str(e)}")
        return False
    finally:
        conn.close()
        
def add_asset(user_id, name, type, current_value):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO assets (user_id, name, type, current_value) VALUES (?, ?, ?, ?)",
                  (user_id, name, type, current_value))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding asset: {str(e)}")
        return False
    finally:
        conn.close()

def get_assets(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT id, name, type, current_value FROM assets WHERE user_id = ?", (user_id,))
        assets = c.fetchall()
        return [{'id': a[0], 'name': a[1], 'type': a[2], 'current_value': a[3]} for a in assets]
    except Exception as e:
        logger.error(f"Error fetching assets: {str(e)}")
        return []
    finally:
        conn.close()

def delete_asset(user_id, asset_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("DELETE FROM assets WHERE id = ? AND user_id = ?", (asset_id, user_id))
        if c.rowcount == 0:
            return False
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting asset: {str(e)}")
        return False
    finally:
        conn.close()

def update_asset(user_id, asset_id, name, asset_type, current_value):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("UPDATE assets SET name = ?, type = ?, current_value = ? WHERE id = ? AND user_id = ?",
                  (name, asset_type, current_value, asset_id, user_id))
        if c.rowcount == 0:
            return False
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error updating asset: {str(e)}")
        return False
    finally:
        conn.close()
        
        
# database.py
def update_budget(user_id, category, amount, alert_enabled=False):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO budgets (user_id, category, amount, alert_enabled) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id, category) UPDATE SET amount = ?, alert_enabled = ?",
            (user_id, category, amount, alert_enabled, amount, alert_enabled)
        )
        conn.commit()
        logger.info(f"Budget updated: user_id={user_id}, category={category}, amount={amount}, alert_enabled={alert_enabled}")
        return True
    except Exception as e:
        logger.error(f"Error updating budget for user_id={user_id}, category={category}: {str(e)}")
        return False
    finally:
        conn.close()
        
        
# database.py
def get_budgets(user_id):
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()
    try:
        c.execute("SELECT category, amount, alert_enabled FROM budgets WHERE user_id = ?", (user_id,))
        budgets = c.fetchall()
        logger.debug(f"Fetched {len(budgets)} budgets for user_id={user_id}")
        return {row[0]: {'amount': row[1], 'alert_enabled': row[2]} for row in budgets}
    except Exception as e:
        logger.error(f"Error fetching budgets for user_id={user_id}: {str(e)}")
        return {}
    finally:
        conn.close()
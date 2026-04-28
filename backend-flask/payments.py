# payments.py
# Simulated payment logic for development. Replace with real payment gateway integration when ready.

from uuid import uuid4

def simulate_payment(amount, currency, user_id, payment_method):
    """
    Simulate a payment process. Always returns success for now.
    Args:
        amount (float): The amount to be paid.
        currency (str): The currency code (e.g., 'USD').
        user_id (str): The ID of the user making the payment.
        payment_method (str): The payment method (e.g., 'card', 'paypal').
    Returns:
        dict: Result of the simulated payment.
    """
    # Simulate processing delay (optional)
    # import time; time.sleep(1)
    transaction_id = f"sim-{uuid4().hex[:12]}"
    return {
        'status': 'success',
        'message': 'Payment simulated successfully.',
        'amount': amount,
        'currency': currency,
        'user_id': user_id,
        'payment_method': payment_method,
        'transaction_id': transaction_id
    }

# In production, replace simulate_payment with real payment gateway logic.

import { API_ENDPOINTS } from '../config/api.js';

export const processBackendPayment = async ({
  amount,
  orderId,
  user,
  currency = 'USD',
  paymentMethod = 'simulated',
}) => {
  if (!user?.uid || !user?.email) {
    throw new Error('You must be signed in to process payment.');
  }

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
    throw new Error('Invalid payment amount.');
  }

  const normalizedPaymentMethod = normalizedAmount === 0 ? 'free' : paymentMethod;

  const initiateResp = await fetch(API_ENDPOINTS.INITIATE_PAYMENT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: normalizedAmount,
      currency,
      userId: user.uid,
      userEmail: user.email,
      paymentMethod: normalizedPaymentMethod,
      orderId,
    }),
  });

  const initiateData = await initiateResp.json();
  if (!initiateResp.ok) {
    throw new Error(initiateData?.message || 'Failed to initiate payment.');
  }

  const transactionId = initiateData?.transactionId;
  if (!transactionId) {
    throw new Error('Payment gateway did not return transaction ID.');
  }

  const verifyResp = await fetch(API_ENDPOINTS.VERIFY_PAYMENT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionId,
      orderId,
    }),
  });

  const verifyData = await verifyResp.json();
  if (!verifyResp.ok || !verifyData?.verified) {
    throw new Error(verifyData?.message || 'Payment verification failed.');
  }

  return {
    transactionId,
    payment: verifyData?.payment || null,
  };
};

export default processBackendPayment;

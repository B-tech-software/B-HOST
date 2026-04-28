import { API_ENDPOINTS } from '../config/api.js';

// Build a stable QR payload string for this ticket
export const buildTicketQrData = ({ order, eventId, user }) => {
  const userId = user?.uid || '';
  const userEmail = user?.email || '';
  const base = [
    'B-RAISE',
    order.id || '',
    eventId || '',
    userId || userEmail || '',
  ].join('|');

  return `${base}|${Date.now()}`;
};

// Save a ticket document in Firestore and notify backend to send email, etc.
export const recordTicketPurchase = async ({ order, eventId, user }) => {
  if (!order || !order.id) {
    throw new Error('recordTicketPurchase: order with id is required');
  }

  const userId = user?.uid || null;
  const userEmail = user?.email || null;
  const qrData = buildTicketQrData({ order, eventId, user });

  // Only allow ticket purchase through backend
  try {
    const response = await fetch(API_ENDPOINTS.PURCHASE_TICKET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order,
        eventId,
        user: user ? { id: userId, email: userEmail } : null,
        qrData,
      }),
    });
    if (!response.ok) {
      let backendMessage = '';
      try {
        const errorData = await response.json();
        backendMessage =
          errorData?.error ||
          errorData?.message ||
          errorData?.detail ||
          '';
      } catch {
        // Ignore JSON parsing errors and use fallback message.
      }

      throw new Error(
        backendMessage || `Backend ticket purchase failed (status ${response.status})`
      );
    }
    const data = await response.json();
    return { qrData: data.ticket?.qrData || qrData };
  } catch (err) {
    console.error('Error calling PURCHASE_TICKET API:', err);

    // Browser/network failures often surface as "Failed to fetch" and are not user-friendly.
    if (
      err?.message === 'Failed to fetch' ||
      err?.name === 'TypeError'
    ) {
      throw new Error(
        'We could not reach the server. Please check your internet connection and try again.'
      );
    }

    throw err;
  }
};

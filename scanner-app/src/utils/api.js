import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const DEVICE_ID_KEY = 'scannerDeviceId';

const getOrCreateDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `scanner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
};

export const API = {
  /**
   * Redeem scanner access code and get event/ticket data
   */
  redeemScannerCode: async (code) => {
    try {
      const deviceId = getOrCreateDeviceId();
      const response = await apiClient.post('/api/organizers/scanner-codes/redeem', {
        code,
        deviceId,
      });
      return response.data;
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      if (backendMessage) {
        throw new Error(backendMessage);
      }
      throw error;
    }
  },

  /**
   * Verify ticket online
   */
  verifyTicket: async (qrData, scannerToken, eventId) => {
    try {
      const response = await apiClient.post('/api/tickets/verify', {
        qrData,
        scannerToken,
        eventId,
      });
      return response.data;
    } catch (error) {
      const reason = error?.response?.data?.reason;
      const message = error?.response?.data?.message;
      if (reason || message) {
        const enriched = new Error(message || reason);
        enriched.reason = reason;
        throw enriched;
      }
      throw error;
    }
  },

  /**
   * Batch sync verified tickets
   */
  syncVerifications: async (verifications, scannerToken) => {
    try {
      const response = await apiClient.post('/api/tickets/verify-batch', {
        verifications,
        scannerToken,
      });
      return response.data;
    } catch (error) {
      const message = error?.response?.data?.message;
      if (message) {
        throw new Error(message);
      }
      throw error;
    }
  },
};

export default API;

import { useState } from 'react';
import styles from './LoginPage.module.css';
import API from '../utils/api.js';

const LoginPage = ({ onLogin }) => {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const handleAccessCodeChange = (e) => {
    setAccessCode(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!accessCode.trim()) {
      setError('Please enter your access code');
      setLoading(false);
      return;
    }

    try {
      if (isOffline) {
        setError('You are offline. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const result = await API.redeemScannerCode(accessCode);

      if (!result.ok) {
        throw new Error(result.message || 'Invalid access code');
      }

      // Cache tickets for offline use
      if (result.tickets) {
        const { offlineSync } = await import('../utils/offlineSync.js');
        offlineSync.cacheTickets(result.tickets);
      }

      if (!result.scannerSession?.scannerToken || !result.scannerSession?.eventId) {
        throw new Error('Scanner session is incomplete. Please redeem the access code again.');
      }

      onLogin(result.scannerSession);
    } catch (err) {
      console.error('Login failed:', err);
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || err.message || 'Failed to verify access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>B-raise Gate Scanner</h1>
          <p className={styles.subtitle}>Event ticket verification</p>
        </div>

        {isOffline && (
          <div className={styles.offlineWarning}>
            ⚠️ You are currently offline. Login requires internet connection.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="accessCode" className={styles.label}>
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={handleAccessCodeChange}
              placeholder="Enter your access code"
              disabled={loading || isOffline}
              maxLength="12"
              className={styles.input}
            />
            <p className={styles.help}>
              Your access code was provided when the event was created
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || isOffline}
            className={styles.submitBtn}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Gate staff verification system</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Works online & offline</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

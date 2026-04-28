import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './ScannerPage.module.css';
import API from '../utils/api.js';
import offlineSync from '../utils/offlineSync.js';

const ScannerPage = ({ session, onLogout }) => {
  const [lastScan, setLastScan] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const lastScannedRef = useRef(null);
  const sessionInvalidRef = useRef(false);
  const isOnlineRef = useRef(navigator.onLine);
  const sessionRef = useRef(session);
  const lastResultTimestampRef = useRef(0);
  const verifyingRef = useRef(false);
  const cooldownRef = useRef(null);
  const scannerDomObserverRef = useRef(null);

  const styleScannerButton = (element, danger = false) => {
    if (!element || !(element instanceof HTMLElement)) return;

    element.style.setProperty('border', 'none', 'important');
    element.style.setProperty('border-radius', '11px', 'important');
    element.style.setProperty('padding', '10px 14px', 'important');
    element.style.setProperty('margin', '0.25rem 0.35rem 0.4rem 0', 'important');
    element.style.setProperty('cursor', 'pointer', 'important');
    element.style.setProperty('font-size', '0.76rem', 'important');
    element.style.setProperty('font-weight', '800', 'important');
    element.style.setProperty('letter-spacing', '0.05em', 'important');
    element.style.setProperty('text-transform', 'uppercase', 'important');
    element.style.setProperty('color', '#f6f9ff', 'important');
    element.style.setProperty('transition', 'transform 0.2s, box-shadow 0.2s, filter 0.2s', 'important');

    if (danger) {
      element.style.setProperty('background', 'linear-gradient(120deg, #d6385a, #b0234c)', 'important');
      element.style.setProperty('box-shadow', '0 8px 18px rgba(214, 56, 90, 0.28)', 'important');
    } else {
      element.style.setProperty('background', 'linear-gradient(120deg, #355ed8, #5f85f0)', 'important');
      element.style.setProperty('box-shadow', '0 8px 18px rgba(72, 110, 255, 0.28)', 'important');
    }
  };

  const decorateScannerControls = () => {
    const controls = document.querySelectorAll("button[id*='html5-qrcode-button-'], a[id*='html5-qrcode-button-']");
    controls.forEach((element) => {
      const controlId = (element.id || '').toLowerCase();
      const controlText = (element.textContent || '').toLowerCase();
      const isDanger = controlId.includes('camera-stop') || controlText.includes('stop scanning');
      styleScannerButton(element, isDanger);
    });
  };

  const stopScanner = async () => {
    const instance = scannerInstanceRef.current;
    if (!instance) return;

    try {
      await instance.clear();
    } catch (error) {
      console.warn('Failed to stop scanner cleanly:', error);
    } finally {
      scannerInstanceRef.current = null;
    }
  };

  const armCooldown = (ms = 4000) => {
    if (cooldownRef.current) {
      window.clearTimeout(cooldownRef.current);
    }

    cooldownRef.current = window.setTimeout(() => {
      lastScannedRef.current = null;
      cooldownRef.current = null;
    }, ms);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    sessionInvalidRef.current = sessionInvalid;
  }, [sessionInvalid]);

  useEffect(() => {
    // Check if there are pending syncs when coming online
    if (isOnline) {
      const queue = offlineSync.getSyncQueue();
      const pending = queue.filter((item) => !item.synced);
      if (pending.length > 0) {
        setSyncPending(true);
        syncPendingVerifications();
      }
    }
  }, [isOnline]);

  useEffect(() => {
    if (!scannerRef.current) return;
    if (sessionInvalid) return;

    // Avoid duplicate scanner dashboards (can happen with StrictMode remounts).
    if (scannerInstanceRef.current) return;

    // Clear any stale html5-qrcode DOM before creating a new instance.
    scannerRef.current.innerHTML = '';

    const html5QrcodeScanner = new Html5QrcodeScanner(
      scannerRef.current.id,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false
    );
    scannerInstanceRef.current = html5QrcodeScanner;

    html5QrcodeScanner.render(
      (decodedText) => {
        void handleQRScan(decodedText);
      },
      () => {
        // Ignore per-frame decode errors
      }
    );

    // Ensure generated scanner controls keep our custom styles.
    const applyStyles = () => decorateScannerControls();
    window.requestAnimationFrame(applyStyles);
    scannerDomObserverRef.current = new MutationObserver(applyStyles);
    scannerDomObserverRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (scannerDomObserverRef.current) {
        scannerDomObserverRef.current.disconnect();
        scannerDomObserverRef.current = null;
      }
      if (scannerInstanceRef.current === html5QrcodeScanner) {
        void stopScanner();
      }
      if (scannerRef.current) {
        scannerRef.current.innerHTML = '';
      }
    };
  }, [sessionInvalid]);

  const handleQRScan = async (qrData) => {
    if (sessionInvalidRef.current || verifyingRef.current) {
      return;
    }

    const locallyVerified = offlineSync.getSuccessfulScan(qrData);
    if (locallyVerified) {
      setLastScan({
        qrData,
        valid: false,
        reason: 'already_scanned',
        timestamp: Date.now(),
        error: locallyVerified.userEmail
          ? `Already scanned for ${locallyVerified.userEmail}`
          : 'This ticket was already scanned on this device.',
        ticket: locallyVerified,
      });
      armCooldown(5000);
      return;
    }

    // Prevent duplicate rapid scans
    if (lastScannedRef.current === qrData && Date.now() - lastResultTimestampRef.current < 2000) {
      return;
    }

    lastScannedRef.current = qrData;
    const timestamp = Date.now();
    verifyingRef.current = true;

    try {
      let result;
      const scannerToken = sessionRef.current?.scannerToken || sessionRef.current?.token || '';
      const scannerEventId = sessionRef.current?.eventId || sessionRef.current?.eventID || sessionRef.current?.event_id || '';

      if (isOnlineRef.current) {
        // Online verification
        result = await API.verifyTicket(qrData, scannerToken, scannerEventId);
      } else {
        // Offline verification
        result = offlineSync.verifyOffline(qrData);
        if (!result) {
          result = { valid: false, reason: 'offline_unavailable' };
        }
      }

      if (result.valid) {
        // Mark as used locally
        offlineSync.markTicketUsedLocally(qrData);
        offlineSync.recordSuccessfulScan(result.ticket || { qrData }, {
          scannerSessionId: sessionRef.current?.id || '',
          scannerToken: sessionRef.current?.scannerToken || sessionRef.current?.token || '',
          source: isOnlineRef.current ? 'online' : 'offline',
        });
        // Queue for sync if offline
        if (!isOnlineRef.current) {
          offlineSync.queueVerification(result.ticket?.id, qrData, 'verified');
        }
      } else {
        // Queue failed verification for logging
        if (!isOnlineRef.current) {
          offlineSync.queueVerification(null, qrData, result.reason || 'failed');
        }
      }

      lastResultTimestampRef.current = timestamp;
      setLastScan({
        qrData,
        valid: result.valid,
        reason: result.reason,
        timestamp,
      });

      armCooldown(result.valid ? 3000 : 5000);

      // Auto-clear success message after 3 seconds
      if (result.valid) {
        setTimeout(() => {
          setLastScan(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Scan verification failed:', error);

      const scannerAuthReasons = new Set([
        'missing_scanner_token',
        'invalid_scanner_token',
        'scanner_session_expired',
        'scanner_event_mismatch',
      ]);

      const backendReason = error?.reason || '';
      const reason = backendReason || 'verification_error';

      setLastScan({
        qrData,
        valid: false,
        reason,
        timestamp,
        error: error.message,
      });

      armCooldown(5000);

      if (scannerAuthReasons.has(backendReason)) {
        setSessionInvalid(true);
        await stopScanner();
        setTimeout(() => {
          onLogout();
        }, 1200);
      }
    } finally {
      verifyingRef.current = false;
    }
  };

  const syncPendingVerifications = async () => {
    if (!isOnline) return;

    const queue = offlineSync.getSyncQueue();
    const pending = queue.filter((item) => !item.synced);

    if (pending.length === 0) {
      setSyncPending(false);
      return;
    }

    try {
      await API.syncVerifications(pending, session.scannerToken);

      // Mark all as synced
      pending.forEach((item) => {
        offlineSync.markSynced(item.timestamp);
      });

      offlineSync.updateLastSyncTime();
      setSyncPending(false);
    } catch (error) {
      console.error('Sync failed:', error);
      // Keep them in queue for retry
    }
  };

  const getStatusDisplay = () => {
    if (!lastScan) return null;

    const { valid, reason } = lastScan;

    if (valid) {
      return {
        className: styles.success,
        icon: '✅',
        message: 'Ticket verified!',
      };
    }

    const reasonMessages = {
      not_found: '❌ Ticket not found',
      already_used: '✅ Ticket already scanned',
      already_scanned: '✅ Ticket already scanned',
      scanner_event_mismatch: '❌ Wrong event',
      missing_scanner_token: '⚠️ Scanner session missing',
      invalid_scanner_token: '⚠️ Invalid scanner session',
      scanner_session_expired: '⚠️ Session expired. Please login again',
      offline_unavailable: '⚠️ Not in cache',
      verification_error: '⚠️ Verification error',
    };

    return {
      className: styles.error,
      icon: '❌',
      message: reasonMessages[reason] || 'Invalid ticket',
    };
  };

  const statusDisplay = getStatusDisplay();

  const containerStateClass = lastScan ? (lastScan.valid ? styles.scanSuccess : styles.scanError) : '';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gate Scanner</h1>
          <p className={styles.eventId}>Event: {session.eventId}</p>
        </div>
        <button onClick={onLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <span className={isOnline ? styles.online : styles.offline}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
          {syncPending && (
            <button onClick={syncPendingVerifications} className={styles.syncBtn}>
              ⬆️ Sync pending
            </button>
          )}
        </div>
      </div>

      <div className={styles.scannerWrapper}>
        <div className={`${styles.scannerContainer} ${containerStateClass}`}>
          <div id="scanner" ref={scannerRef} className={styles.scanner} />
        </div>
      </div>

      {statusDisplay && (
        <div key={lastScan.timestamp} className={`${styles.feedbackToast} ${statusDisplay.className}`}>
          <div className={styles.statusMessage}>
            <span>{statusDisplay.icon}</span>
            <span>{statusDisplay.message}</span>
          </div>
          {(lastScan.reason === 'already_used' || lastScan.reason === 'already_scanned') && (
            <p style={{ fontSize: '12px', marginTop: '0.5rem', opacity: 0.9 }}>
              {lastScan.error || 'This ticket has already been scanned. Avoid rescanning it.'}
            </p>
          )}
          {lastScan.reason === 'already_scanned' && (
            <p style={{ fontSize: '12px', marginTop: '0.5rem', opacity: 0.9 }}>
              {lastScan.error}
            </p>
          )}
          {lastScan.error && lastScan.reason !== 'already_used' && (
            <p className={styles.errorDetail}>{lastScan.error}</p>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <p>Point camera at QR code to scan</p>
        <p style={{ fontSize: '12px', opacity: 0.7 }}>
          {sessionInvalid
            ? 'Session invalid - returning to login'
            : isOnline
              ? 'Real-time verification'
              : 'Offline mode - syncs when online'}
        </p>
      </div>
    </div>
  );
};

export default ScannerPage;

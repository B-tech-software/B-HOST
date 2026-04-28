import { useEffect, useState } from 'react';
import styles from './SyncStatus.module.css';

const SyncStatus = () => {
  const [lastSync, setLastSync] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateSync = () => {
      const time = localStorage.getItem('lastSyncTime');
      setLastSync(time);
    };

    updateSync();
    const interval = setInterval(updateSync, 60000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const onManualSync = () => {
    // Emit an event so the app can handle manual sync (keeps this component decoupled)
    window.dispatchEvent(new Event('manualSync'));
    // optimistic update
    const now = new Date().toISOString();
    localStorage.setItem('lastSyncTime', now);
    setLastSync(now);
  };

  const syncDate = lastSync ? new Date(lastSync) : null;
  const now = new Date();
  const diffMinutes = syncDate ? Math.floor((now - syncDate) / 60000) : null;

  let syncText = 'Never';
  if (diffMinutes === 0) syncText = 'Just now';
  else if (diffMinutes > 0) syncText = `${diffMinutes}m ago`;

  return (
    <div className={styles.syncIndicator} title={syncDate ? syncDate.toString() : ''}>
      <div className={`${styles.dot} ${isOnline ? '' : styles.offline}`} />
      <div className={styles.muted}>
        {isOnline ? 'Online' : 'Offline'} • {syncText}
      </div>
      <button className={styles.syncBtn} onClick={onManualSync}>
        Sync now
      </button>
    </div>
  );
};

export default SyncStatus;

/**
 * Offline-first sync utilities for scanner app
 * Stores verification attempts locally and syncs when online
 */

const SYNC_QUEUE_KEY = 'scannerSyncQueue';
const TICKET_CACHE_KEY = 'ticketCache';
const SCANNED_TICKETS_KEY = 'scannerVerifiedTickets';
const LAST_SYNC_KEY = 'lastSyncTime';

export const offlineSync = {
  /**
   * Queue a ticket verification for sync
   */
  queueVerification: (ticketId, qrData, status) => {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    queue.push({
      ticketId,
      qrData,
      status,
      timestamp: new Date().toISOString(),
      synced: false,
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Get pending sync queue
   */
  getSyncQueue: () => {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  },

  /**
   * Mark verification as synced
   */
  markSynced: (timestamp) => {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    const updated = queue.map((item) =>
      item.timestamp === timestamp ? { ...item, synced: true } : item
    );
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  },

  /**
   * Cache valid tickets for offline use
   */
  cacheTickets: (tickets) => {
    const cache = {
      tickets: tickets.map((t) => ({
        id: t.id,
        qrData: t.qrData,
        eventId: t.eventId,
        usedAt: t.usedAt,
      })),
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(TICKET_CACHE_KEY, JSON.stringify(cache));
  },

  /**
   * Get cached tickets for offline verification
   */
  getCachedTickets: () => {
    const cached = localStorage.getItem(TICKET_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Verify ticket against local cache (offline mode)
   */
  verifyOffline: (qrData) => {
    const cache = offlineSync.getCachedTickets();
    if (!cache) return null;

    const ticket = cache.tickets.find((t) => t.qrData === qrData);
    if (!ticket) {
      return { valid: false, reason: 'not_found' };
    }

    if (ticket.usedAt) {
      return { valid: false, reason: 'already_scanned', ticket };
    }

    return { valid: true, ticket };
  },

  /**
   * Mark ticket as used locally
   */
  markTicketUsedLocally: (qrData) => {
    const cache = JSON.parse(localStorage.getItem(TICKET_CACHE_KEY) || '{}');
    if (cache.tickets) {
      const ticket = cache.tickets.find((t) => t.qrData === qrData);
      if (ticket) {
        ticket.usedAt = new Date().toISOString();
        localStorage.setItem(TICKET_CACHE_KEY, JSON.stringify(cache));
      }
    }
  },

  /**
   * Record a successful scan locally so repeated scans can be blocked
   * and audit details are preserved on the device.
   */
  recordSuccessfulScan: (ticket, meta = {}) => {
    if (!ticket || !ticket.qrData) return;

    const records = JSON.parse(localStorage.getItem(SCANNED_TICKETS_KEY) || '[]');
    const existingIndex = records.findIndex((item) => item.qrData === ticket.qrData);
    const record = {
      ticketId: ticket.id || null,
      qrData: ticket.qrData,
      userEmail: ticket.userEmail || ticket.user?.email || '',
      eventId: ticket.eventId || '',
      ticketType: ticket.order?.ticketType || ticket.ticketType || '',
      usedAt: ticket.usedAt || new Date().toISOString(),
      scannedAt: new Date().toISOString(),
      scannerSessionId: meta.scannerSessionId || '',
      scannerToken: meta.scannerToken || '',
      source: meta.source || 'online',
    };

    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.push(record);
    }

    localStorage.setItem(SCANNED_TICKETS_KEY, JSON.stringify(records));
  },

  /**
   * Get a locally recorded successful scan by QR data.
   */
  getSuccessfulScan: (qrData) => {
    const records = JSON.parse(localStorage.getItem(SCANNED_TICKETS_KEY) || '[]');
    return records.find((item) => item.qrData === qrData) || null;
  },

  /**
   * Return all locally recorded successful scans.
   */
  getSuccessfulScans: () => {
    return JSON.parse(localStorage.getItem(SCANNED_TICKETS_KEY) || '[]');
  },

  /**
   * Clear local data
   */
  clearCache: () => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    localStorage.removeItem(TICKET_CACHE_KEY);
    localStorage.removeItem(SCANNED_TICKETS_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  },

  /**
   * Get last sync time
   */
  getLastSyncTime: () => {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  /**
   * Update last sync time
   */
  updateLastSyncTime: () => {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  },
};

export default offlineSync;

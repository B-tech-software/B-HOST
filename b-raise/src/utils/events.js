const PUBLIC_EVENT_STATUSES = new Set(['approved', 'active', 'live']);

export const normalizeEventStatus = (status) => String(status || '').trim().toLowerCase();

export const isPublicEventStatus = (status) => PUBLIC_EVENT_STATUSES.has(normalizeEventStatus(status));

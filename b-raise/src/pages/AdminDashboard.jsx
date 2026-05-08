import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../context/useAuth.js';
import './Dashboards.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingOrganizers, setPendingOrganizers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [loadingOwnerStats, setLoadingOwnerStats] = useState(false);
  const [ownerStatsError, setOwnerStatsError] = useState('');
  const [ownerEventsStats, setOwnerEventsStats] = useState([]);
  const [selectedOwnerEventId, setSelectedOwnerEventId] = useState('');
  const [ownerStatsLastUpdated, setOwnerStatsLastUpdated] = useState('');

  const stats = useMemo(() => {
    const totalPending = pendingOrganizers.length + pendingEvents.length;

    return {
      pendingOrganizers: pendingOrganizers.length,
      pendingEvents: pendingEvents.length,
      totalPending,
    };
  }, [pendingOrganizers.length, pendingEvents.length]);

  const getAuthHeaders = async () => {
    if (!user) throw new Error('You must be signed in as owner.');
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadDashboard = async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      const [organizersResponse, eventsResponse] = await Promise.all([
        fetch(API_ENDPOINTS.ADMIN_PENDING_ORGANIZERS, { headers }),
        fetch(API_ENDPOINTS.ADMIN_PENDING_EVENTS, { headers }),
      ]);

      const [organizersPayload, eventsPayload] = await Promise.all([
        organizersResponse.json(),
        eventsResponse.json(),
      ]);

      if (!organizersResponse.ok) {
        throw new Error(organizersPayload?.message || 'Could not load pending organizers.');
      }

      if (!eventsResponse.ok) {
        throw new Error(eventsPayload?.message || 'Could not load pending events.');
      }

      setPendingOrganizers(organizersPayload?.organizers || []);
      setPendingEvents(eventsPayload?.events || []);
      setLastRefreshed(new Date().toLocaleString());
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadOwnerEventStats = async ({ silent = false } = {}) => {
    if (!user) return;

    if (!silent) {
      setLoadingOwnerStats(true);
    }
    setOwnerStatsError('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.ADMIN_EVENT_STATS, { headers });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Could not load owner event stats.');
      }

      const events = Array.isArray(payload?.events) ? payload.events : [];
      setOwnerEventsStats(events);
      setOwnerStatsLastUpdated(new Date().toLocaleTimeString());

      setSelectedOwnerEventId((prev) => {
        if (prev && events.some((event) => event.id === prev)) {
          return prev;
        }
        const firstActive = events.find((event) => ['approved', 'active', 'live'].includes(event.status));
        return firstActive?.id || events[0]?.id || '';
      });
    } catch (err) {
      console.error('Failed to load owner event stats:', err);
      setOwnerStatsError(err.message || 'Failed to load owner event stats.');
    } finally {
      if (!silent) {
        setLoadingOwnerStats(false);
      }
    }
  };

  const updateReviewNote = (scope, id, value) => {
    const key = `${scope}-${id}`;
    setReviewNotes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getReviewNote = (scope, id) => reviewNotes[`${scope}-${id}`] || '';

  useEffect(() => {
    const initializeDashboard = async () => {
      setInitialLoading(true);

      try {
        await Promise.allSettled([loadDashboard(), loadOwnerEventStats()]);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return undefined;

    const intervalId = window.setInterval(() => {
      loadOwnerEventStats({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const activeOwnerEvents = useMemo(
    () => ownerEventsStats.filter((event) => ['approved', 'active', 'live'].includes(event.status)),
    [ownerEventsStats]
  );

  const selectableOwnerEvents = useMemo(() => {
    const list = Array.isArray(ownerEventsStats) ? [...ownerEventsStats] : [];
    return list.sort((a, b) => {
      const aDate = String(a?.date || '');
      const bDate = String(b?.date || '');
      return bDate.localeCompare(aDate);
    });
  }, [ownerEventsStats]);

  const selectedOwnerEvent = useMemo(
    () => ownerEventsStats.find((event) => event.id === selectedOwnerEventId) || null,
    [ownerEventsStats, selectedOwnerEventId]
  );

  const ownerTotals = useMemo(() => {
    let sold = 0;
    let capacity = 0;
    let hasKnownCapacity = false;

    activeOwnerEvents.forEach((event) => {
      sold += Number(event?.totals?.sold || 0);
      if (typeof event?.totals?.capacity === 'number') {
        hasKnownCapacity = true;
        capacity += Number(event.totals.capacity || 0);
      }
    });

    return {
      events: activeOwnerEvents.length,
      sold,
      capacity: hasKnownCapacity ? capacity : null,
      left: hasKnownCapacity ? Math.max(capacity - sold, 0) : null,
    };
  }, [activeOwnerEvents]);

  const reviewOrganizer = async (uid, decision, reviewNote = '') => {
    const key = `org-${uid}-${decision}`;
    setBusyKey(key);
    setError('');
    setSuccess('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.ADMIN_REVIEW_ORGANIZER, {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid, decision, reviewNote }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Organizer review failed.');
      }

      setPendingOrganizers((prev) => prev.filter((item) => item.uid !== uid));
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[`org-${uid}`];
        return next;
      });
      setSuccess(`Organizer ${decision} successfully.`);
    } catch (err) {
      console.error('Organizer review failed:', err);
      setError(err.message || 'Organizer review failed.');
    } finally {
      setBusyKey('');
    }
  };

  const reviewEvent = async (eventId, decision, reviewNote = '') => {
    const key = `event-${eventId}-${decision}`;
    setBusyKey(key);
    setError('');
    setSuccess('');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(API_ENDPOINTS.ADMIN_REVIEW_EVENT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventId, decision, reviewNote }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Event review failed.');
      }

      setPendingEvents((prev) => prev.filter((item) => item.id !== eventId));
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[`event-${eventId}`];
        return next;
      });
      setSuccess(`Event ${decision} successfully.`);
    } catch (err) {
      console.error('Event review failed:', err);
      setError(err.message || 'Event review failed.');
    } finally {
      setBusyKey('');
    }
  };

  const mutateEventStatus = async (eventId, action) => {
    try {
      const headers = await getAuthHeaders();
      const endpoint = action === 'restore' ? API_ENDPOINTS.RESTORE_EVENT : API_ENDPOINTS.DELETE_EVENT;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || `${action} failed`);
      }
      await loadOwnerEventStats();
      return payload;
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="contact-page py-5 dash-shell owner-dash-shell" style={{ minHeight: '100vh' }}>
      <Container>
        {initialLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '70vh' }}>
            <Spinner animation="border" variant="light" />
            <div className="mt-3" style={{ opacity: 0.85 }}>
              Loading owner dashboard...
            </div>
          </div>
        ) : (
          <>
        <Row className="justify-content-center mb-4 text-center section-animate">
          <Col lg={8}>
            <span className="contact-badge mb-2">
              <span className="contact-status-dot" />
              <span className="contact-status-label">Owner access only</span>
            </span>
            <h1 className="mb-2 contact-hero-title">Owner Dashboard</h1>
            <p className="mb-0 contact-hero-subtitle" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
              Approve organizers and event submissions before they go live.
            </p>
            {user?.email && (
              <div className="mt-3 small" style={{ opacity: 0.85 }}>
                Signed in as <strong>{user.email}</strong>
              </div>
            )}
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {!loading && (
          <Row className="g-4 mb-4 section-animate-delayed">
            <Col md={4}>
              <div className="contact-card p-4 h-100 metric-tile">
                <div className="small text-uppercase" style={{ opacity: 0.7, letterSpacing: '0.12em' }}>
                  Pending organizers
                </div>
                <div className="display-6 fw-bold mt-2 metric-value">{stats.pendingOrganizers}</div>
                <div style={{ opacity: 0.85 }}>Applications waiting for review.</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="contact-card p-4 h-100 metric-tile">
                <div className="small text-uppercase" style={{ opacity: 0.7, letterSpacing: '0.12em' }}>
                  Pending events
                </div>
                <div className="display-6 fw-bold mt-2 metric-value">{stats.pendingEvents}</div>
                <div style={{ opacity: 0.85 }}>Draft or pending events to moderate.</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="contact-card p-4 h-100 metric-tile">
                <div className="small text-uppercase" style={{ opacity: 0.7, letterSpacing: '0.12em' }}>
                  Last refreshed
                </div>
                <div className="mt-2 fw-semibold">{lastRefreshed || 'Not yet refreshed'}</div>
                <div style={{ opacity: 0.85 }}>{stats.totalPending} moderation items in total.</div>
              </div>
            </Col>
          </Row>
        )}

        {!loading && (
          <div className="contact-card p-4 mb-4 section-animate-delayed analytics-card">
            <div className="d-flex justify-content-end mb-3">
              <Button
                className="dashboard-ghost-btn"
                variant="outline-light"
                size="sm"
                onClick={() => loadOwnerEventStats()}
                disabled={loadingOwnerStats}
              >
                Refresh stats
              </Button>
            </div>

            {ownerStatsError && <Alert variant="danger" className="mb-3">{ownerStatsError}</Alert>}

            {loadingOwnerStats && ownerEventsStats.length === 0 && (
              <div className="text-center py-3">
                <Spinner animation="border" variant="light" />
                <div className="mt-2" style={{ opacity: 0.85 }}>Loading analytics...</div>
              </div>
            )}

            {selectableOwnerEvents.length === 0 ? (
              <Alert variant="secondary" className="mb-0">
                No events available yet.
              </Alert>
            ) : (
              <>
                <Row className="g-3 mb-3">
                  <Col md={7}>
                    <Form.Group controlId="ownerEventSelector">
                      <Form.Label className="small mb-1">Select event</Form.Label>
                      <Form.Select
                        value={selectedOwnerEventId}
                        onChange={(e) => setSelectedOwnerEventId(e.target.value)}
                      >
                        {selectableOwnerEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.title} ({event?.totals?.sold || 0} sold)
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {selectedOwnerEvent && (
                  <div className="border rounded p-3 event-detail-panel" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 event-detail-header">
                      <div>
                        <h6 className="mb-1 event-detail-title">{selectedOwnerEvent.title}</h6>
                        <div className="small" style={{ opacity: 0.9 }}>
                          Host: {selectedOwnerEvent.createdByEmail || selectedOwnerEvent.createdBy || 'N/A'}
                        </div>
                        <div className="small" style={{ opacity: 0.9 }}>
                          {selectedOwnerEvent.date || 'Date TBD'} {selectedOwnerEvent.time ? `• ${selectedOwnerEvent.time}` : ''} {selectedOwnerEvent.venue ? `• ${selectedOwnerEvent.venue}` : ''}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="info" text="dark" className="text-uppercase event-status-badge">
                          {selectedOwnerEvent.status || 'unknown'}
                        </Badge>
                        <Button
                          variant={String(selectedOwnerEvent.status || '').toLowerCase() === 'deleted' ? 'outline-success' : 'outline-danger'}
                          size="sm"
                          onClick={async () => {
                            const isDeleted = String(selectedOwnerEvent.status || '').toLowerCase() === 'deleted';
                            const action = isDeleted ? 'restore' : 'delete';
                            const promptText = isDeleted
                              ? 'Restore this event back to the dashboard?'
                              : 'Move this event to Trash? You can restore it later.';
                            if (!window.confirm(promptText)) return;
                            try {
                              await mutateEventStatus(selectedOwnerEvent.id, action);
                              alert(isDeleted ? 'Event restored' : 'Event moved to trash');
                            } catch (err) {
                              console.error('Event status change failed', err);
                              alert(err.message || 'Failed to update event');
                            }
                          }}
                        >
                          {String(selectedOwnerEvent.status || '').toLowerCase() === 'deleted' ? 'Restore' : 'Delete'}
                        </Button>
                      </div>
                    </div>

                    <Row className="g-3 mb-3">
                      <Col md={4}><div>Sold: <strong>{selectedOwnerEvent?.totals?.sold || 0}</strong></div></Col>
                      <Col md={4}><div>Capacity: <strong>{selectedOwnerEvent?.totals?.capacity ?? 'N/A'}</strong></div></Col>
                      <Col md={4}><div>Left: <strong>{selectedOwnerEvent?.totals?.left ?? 'N/A'}</strong></div></Col>
                    </Row>

                    <div className="table-responsive">
                      <Table striped bordered hover variant="dark" size="sm" className="mb-0 dashboard-table">
                        <thead>
                          <tr>
                            <th>Ticket Type</th>
                            <th>Sold</th>
                            <th>Capacity</th>
                            <th>Left</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedOwnerEvent.ticketTypes || []).map((entry) => (
                            <tr key={`${selectedOwnerEvent.id}-${entry.type}`}>
                              <td style={{ textTransform: 'capitalize' }}>{entry.type}</td>
                              <td>{entry.sold ?? 0}</td>
                              <td>{entry.capacity ?? 'N/A'}</td>
                              <td>{entry.left ?? 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="light" />
            <div className="mt-2" style={{ opacity: 0.85 }}>Loading dashboard...</div>
          </div>
        ) : (
          <>
            <Row className="g-4 mb-4">
              <Col lg={6}>
                <div className="contact-card p-4 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Pending Organizers</h5>
                    <Button variant="outline-light" size="sm" onClick={loadDashboard}>
                      Refresh
                    </Button>
                  </div>
                  {pendingOrganizers.length === 0 ? (
                    <p className="mb-0" style={{ opacity: 0.85 }}>No pending organizer applications.</p>
                  ) : (
                    pendingOrganizers.map((org) => (
                      <div key={org.id} className="border rounded p-3 mb-3" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
                        <div className="fw-semibold">{org.organizationName || org.displayName || 'Organizer application'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Account email: {org.email || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Organizer email: {org.organizerEmail || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Phone: {org.phone || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Address: {org.address || 'N/A'}</div>
                        <Form.Group className="mt-3">
                          <Form.Label className="small mb-1">Review note</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={getReviewNote('org', org.uid)}
                            onChange={(e) => updateReviewNote('org', org.uid, e.target.value)}
                            placeholder="Optional note for approval or rejection"
                          />
                        </Form.Group>
                        <div className="mt-3 d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            disabled={busyKey === `org-${org.uid}-approved`}
                            onClick={() => reviewOrganizer(org.uid, 'approved', getReviewNote('org', org.uid))}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={busyKey === `org-${org.uid}-rejected`}
                            onClick={() => reviewOrganizer(org.uid, 'rejected', getReviewNote('org', org.uid))}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Col>

              <Col lg={6}>
                <div className="contact-card p-4 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Pending Events</h5>
                    <Button variant="outline-light" size="sm" onClick={loadDashboard}>
                      Refresh
                    </Button>
                  </div>
                  {pendingEvents.length === 0 ? (
                    <p className="mb-0" style={{ opacity: 0.85 }}>No pending events.</p>
                  ) : (
                    pendingEvents.map((event) => (
                      <div key={event.id} className="border rounded p-3 mb-3" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
                        <div className="fw-semibold">{event.title || 'Untitled event'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Host: {event.createdByEmail || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Date: {event.date || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Venue: {event.venue || 'N/A'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>Status: {event.status || 'draft'}</div>
                        <Form.Group className="mt-3">
                          <Form.Label className="small mb-1">Review note</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={getReviewNote('event', event.id)}
                            onChange={(e) => updateReviewNote('event', event.id, e.target.value)}
                            placeholder="Optional note for approval or rejection"
                          />
                        </Form.Group>
                        <div className="mt-3 d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            disabled={busyKey === `event-${event.id}-approved`}
                            onClick={() => reviewEvent(event.id, 'approved', getReviewNote('event', event.id))}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={busyKey === `event-${event.id}-rejected`}
                            onClick={() => reviewEvent(event.id, 'rejected', getReviewNote('event', event.id))}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Col>
            </Row>
          </>
        )}
          </>
        )}
      </Container>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../context/useAuth.js';
import './Dashboards.css';

const OrganizerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [eventsStats, setEventsStats] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [scannerTeamText, setScannerTeamText] = useState('');
  const [maxDevices, setMaxDevices] = useState(1);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [scannerCodeError, setScannerCodeError] = useState('');
  const [scannerCodeSuccess, setScannerCodeSuccess] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [viewMode, setViewMode] = useState('active');

  const parseScannerTeam = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') return [];

    return rawValue
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const [name = '', email = '', phone = ''] = parts;
          return { name, email: email.toLowerCase(), phone };
        }

        const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) {
          return { name: '', email: String(emailMatch[0]).toLowerCase(), phone: '' };
        }

        return null;
      })
      .filter((scanner) => scanner && scanner.email);
  };

  const handleGenerateScannerCodes = async (e) => {
    e.preventDefault();
    setScannerCodeError('');
    setScannerCodeSuccess('');
    setGeneratedCodes([]);

    if (!selectedEventId) {
      setScannerCodeError('Select an event first.');
      return;
    }

    const scanners = parseScannerTeam(scannerTeamText);
    if (scanners.length === 0) {
      setScannerCodeError('Add scanner team details with at least one valid email.');
      return;
    }

    try {
      setGeneratingCodes(true);
      const response = await fetch(API_ENDPOINTS.CREATE_SCANNER_CODES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          eventId: selectedEventId,
          scanners,
          maxDevicesPerScanner: Number(maxDevices) || 1,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to generate scanner codes.');
      }

      const codes = Array.isArray(payload?.codes) ? payload.codes : [];
      setGeneratedCodes(codes);
      setScannerCodeSuccess(`Generated ${codes.length} scanner code${codes.length === 1 ? '' : 's'} successfully.`);
      setScannerTeamText('');
    } catch (err) {
      console.error('Failed to generate scanner codes:', err);
      setScannerCodeError(err.message || 'Failed to generate scanner codes.');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const loadOrganizerStatus = async () => {
    if (!user?.uid) {
      setOrganizerStatus(null);
      setCheckingAccess(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_ENDPOINTS.ORGANIZER_STATUS}?uid=${encodeURIComponent(user.uid)}`
      );
      const payload = await response.json();
      setOrganizerStatus(payload?.status || null);
    } catch (err) {
      console.error('Failed to load organizer status:', err);
      setOrganizerStatus(null);
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadEventStats = async ({ silent = false } = {}) => {
    if (!user?.uid) {
      setEventsStats([]);
      setSelectedEventId('');
      return;
    }

    if (!silent) {
      setLoadingStats(true);
    }
    setStatsError('');

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${API_ENDPOINTS.ORGANIZER_EVENT_STATS}?uid=${encodeURIComponent(user.uid)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not load organizer event stats.');
      }

      const items = Array.isArray(payload?.events) ? payload.events : [];
      setEventsStats(items);
      setLastUpdated(new Date().toLocaleTimeString());

      setSelectedEventId((prev) => {
        const matchingViewItems = items.filter((event) => {
          const normalized = String(event?.status || '').toLowerCase();
          return viewMode === 'trash' ? normalized === 'deleted' : normalized !== 'deleted';
        });

        if (prev && matchingViewItems.some((event) => event.id === prev)) {
          return prev;
        }
        const firstPreferred = viewMode === 'trash'
          ? matchingViewItems[0]
          : matchingViewItems.find((event) => ['approved', 'active', 'live'].includes(String(event?.status || '').toLowerCase())) || matchingViewItems[0];
        return firstPreferred?.id || '';
      });
    } catch (err) {
      console.error('Failed to load organizer event stats:', err);
      setStatsError(err.message || 'Failed to load organizer dashboard stats.');
    } finally {
      if (!silent) {
        setLoadingStats(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadOrganizerStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid]);

  useEffect(() => {
    if (organizerStatus !== 'approved') return;
    loadEventStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerStatus, user?.uid]);

  useEffect(() => {
    if (organizerStatus !== 'approved') return undefined;

    const intervalId = window.setInterval(() => {
      loadEventStats({ silent: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerStatus, user?.uid]);

  const selectableEvents = useMemo(() => {
    const baseList = Array.isArray(eventsStats) ? [...eventsStats] : [];
    const list = baseList.filter((event) => {
      const normalized = String(event?.status || '').toLowerCase();
      return viewMode === 'trash' ? normalized === 'deleted' : normalized !== 'deleted';
    });
    return list.sort((a, b) => {
      const aDate = String(a?.date || '');
      const bDate = String(b?.date || '');
      return bDate.localeCompare(aDate);
    });
  }, [eventsStats, viewMode]);

  const selectedEvent = useMemo(
    () => selectableEvents.find((event) => event.id === selectedEventId) || null,
    [selectableEvents, selectedEventId]
  );

  const dashboardStats = useMemo(() => {
    const totalEvents = eventsStats.filter((event) => String(event?.status || '').toLowerCase() !== 'deleted').length;
    const deletedEvents = eventsStats.filter((event) => String(event?.status || '').toLowerCase() === 'deleted').length;

    return {
      totalEvents,
      deletedEvents,
    };
  }, [eventsStats]);

  const normalizeTicketKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const extractCapacity = (value) => {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
      return match ? Math.max(Number(match[0]), 0) : 0;
    }
    if (typeof value === 'object') {
      for (const key of ['quantity', 'qty', 'count', 'capacity', 'available', 'availableQuantity', 'ticketsAvailable', 'ticketCount', 'total', 'stock', 'limit', 'max', 'value', 'amount']) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const nested = extractCapacity(value[key]);
          if (nested > 0) return nested;
        }
      }
    }
    return 0;
  };

  const buildTicketRows = (event) => {
    const config = event?.ticketConfig;
    const soldMap = new Map();

    (event?.ticketTypes || []).forEach((entry) => {
      soldMap.set(normalizeTicketKey(entry?.type), Number(entry?.sold || 0));
    });

    const rows = [];

    if (config && typeof config === 'object' && !Array.isArray(config)) {
      Object.entries(config).forEach(([rawType, rawValue]) => {
        const normalized = normalizeTicketKey(rawType);
        const capacity = extractCapacity(rawValue);
        const sold = soldMap.get(normalized) || 0;

        rows.push({
          type: rawType,
          sold,
          capacity,
          left: Math.max(capacity - sold, 0),
        });
      });
    }

    if (rows.length === 0) {
      (event?.ticketTypes || []).forEach((entry) => {
        rows.push({
          type: entry?.type,
          sold: Number(entry?.sold || 0),
          capacity: Number(entry?.capacity || 0),
          left: Number.isFinite(Number(entry?.left)) ? Number(entry.left) : null,
        });
      });
    }

    return rows.sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')));
  };

  const getStatusVariant = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['approved', 'active', 'live'].includes(normalized)) return 'success';
    if (['draft', 'pending'].includes(normalized)) return 'warning';
    if (['rejected', 'cancelled', 'archived', 'deleted'].includes(normalized)) return 'danger';
    return 'secondary';
  };

  const mutateEventStatus = async (eventId, action) => {
    const token = await user.getIdToken();
    const endpoint = action === 'restore' ? API_ENDPOINTS.RESTORE_EVENT : API_ENDPOINTS.DELETE_EVENT;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventId, uid: user.uid }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || `${action} failed`);
    }

    await loadEventStats();
    return payload;
  };

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!authLoading && !checkingAccess && organizerStatus !== 'approved') {
    return <Navigate to="/host" replace />;
  }

  return (
    <div className="contact-page about-page py-5 dash-shell organizer-dash-shell" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center section-animate-delayed">
          <Col lg={11} xl={10}>
            <div className="contact-card p-4 p-md-4 analytics-card dashboard-shell" style={{ borderRadius: '20px' }}>
              <div className="dashboard-command-bar mb-4">
                <div>
                  <div className="dashboard-eyebrow">Organizer Workspace</div>
                  <h5 className="mb-1 dashboard-title">Event Operations Dashboard</h5>
                  <p className="mb-0 dashboard-subtitle">
                    Monitor ticket performance and manage your event in one place.
                  </p>
                </div>
                <div className="dashboard-command-actions">
                  <small className="dashboard-updated-at">Updated: {lastUpdated || 'Not yet'}</small>
                  <Button className="dashboard-ghost-btn" variant="outline-light" size="sm" onClick={() => loadEventStats()} disabled={loadingStats}>
                    Refresh
                  </Button>
                </div>
              </div>

              {(authLoading || checkingAccess) && (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="light" />
                  <div className="mt-2" style={{ opacity: 0.85 }}>Checking organizer access...</div>
                </div>
              )}

              {!authLoading && !checkingAccess && (
                <>
                  {statsError && <Alert variant="danger" className="mb-3">{statsError}</Alert>}

                  {loadingStats && eventsStats.length === 0 && (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="light" />
                      <div className="mt-2" style={{ opacity: 0.85 }}>Loading event stats...</div>
                    </div>
                  )}

                  {!loadingStats && (
                    <>
                      <Row className="g-3 mb-4">
                        <Col md={6} xl={3}>
                          <div className="dashboard-kpi-card">
                            <div className="kpi-label">Total events</div>
                            <div className="kpi-value">{dashboardStats.totalEvents}</div>
                          </div>
                        </Col>
                        <Col md={6} xl={3}>
                          <div className="dashboard-kpi-card">
                            <div className="kpi-label">Deleted events</div>
                            <div className="kpi-value">{dashboardStats.deletedEvents}</div>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex flex-wrap gap-2 mb-3">
                        <Button
                          variant={viewMode === 'active' ? 'light' : 'outline-light'}
                          size="sm"
                          onClick={() => setViewMode('active')}
                        >
                          Active events
                        </Button>
                        <Button
                          variant={viewMode === 'trash' ? 'light' : 'outline-light'}
                          size="sm"
                          onClick={() => setViewMode('trash')}
                        >
                          Trash ({dashboardStats.deletedEvents})
                        </Button>
                      </div>

                      {selectableEvents.length === 0 ? (
                        <Alert variant="secondary" className="mb-0">
                          No events found yet. Create an event to view its analytics.
                        </Alert>
                      ) : (
                        <Row className="g-3">
                          <Col lg={4}>
                            <div className="dashboard-panel p-3">
                              <Form.Group controlId="organizerEventSelector" className="mb-3">
                                <Form.Label className="small mb-1">Focus event</Form.Label>
                                <Form.Select
                                  value={selectedEventId}
                                  onChange={(e) => setSelectedEventId(e.target.value)}
                                >
                                  {selectableEvents.map((event) => (
                                    <option key={event.id} value={event.id}>
                                      {event.title} ({event?.totals?.sold || 0} sold)
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>

                              <div className="dashboard-event-list">
                                {selectableEvents.map((event) => (
                                  <button
                                    key={event.id}
                                    type="button"
                                    className={`event-list-item ${event.id === selectedEventId ? 'active' : ''}`}
                                    onClick={() => setSelectedEventId(event.id)}
                                  >
                                    <div className="event-list-title">{event.title}</div>
                                    <div className="event-list-meta">{event.date || 'Date TBD'} • {event?.totals?.sold || 0} sold</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </Col>

                          <Col lg={8}>
                            {selectedEvent && (
                              <div className="dashboard-panel p-3 event-detail-panel">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 event-detail-header">
                                  <div>
                                    <h6 className="mb-1 event-detail-title">{selectedEvent.title}</h6>
                                    <div className="small" style={{ opacity: 0.9 }}>
                                      {selectedEvent.date || 'Date TBD'} {selectedEvent.time ? `• ${selectedEvent.time}` : ''} {selectedEvent.venue ? `• ${selectedEvent.venue}` : ''}
                                    </div>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <Badge bg={getStatusVariant(selectedEvent.status)} className="text-uppercase event-status-badge">
                                      {selectedEvent.status || 'unknown'}
                                    </Badge>
                                    <Button
                                      variant={String(selectedEvent.status || '').toLowerCase() === 'deleted' ? 'outline-success' : 'outline-danger'}
                                      size="sm"
                                      onClick={async () => {
                                        const isDeleted = String(selectedEvent.status || '').toLowerCase() === 'deleted';
                                        const action = isDeleted ? 'restore' : 'delete';
                                        const promptText = isDeleted
                                          ? 'Restore this event back to the dashboard?'
                                          : 'Move this event to Trash? You can restore it later.';
                                        if (!window.confirm(promptText)) return;
                                        try {
                                          await mutateEventStatus(selectedEvent.id, action);
                                          setViewMode(isDeleted ? 'active' : 'trash');
                                          alert(isDeleted ? 'Event restored' : 'Event moved to trash');
                                        } catch (err) {
                                          console.error('Event status change failed', err);
                                          alert(err.message || 'Failed to update event');
                                        }
                                      }}
                                    >
                                      {String(selectedEvent.status || '').toLowerCase() === 'deleted' ? 'Restore' : 'Delete'}
                                    </Button>
                                  </div>
                                </div>

                                <Row className="g-3 mb-3">
                                  <Col md={4}><div className="mini-stat">Sold <strong>{selectedEvent?.totals?.sold || 0}</strong></div></Col>
                                  <Col md={4}><div className="mini-stat">Capacity <strong>{selectedEvent?.totals?.capacity ?? 'N/A'}</strong></div></Col>
                                  <Col md={4}><div className="mini-stat">Left <strong>{selectedEvent?.totals?.left ?? 'N/A'}</strong></div></Col>
                                </Row>

                                <div className="table-responsive mb-3">
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
                                        {buildTicketRows(selectedEvent).map((entry) => (
                                        <tr key={`${selectedEvent.id}-${entry.type}`}>
                                          <td style={{ textTransform: 'capitalize' }}>{entry.type}</td>
                                          <td>{entry.sold ?? 0}</td>
                                            <td>{entry.capacity ?? 'N/A'}</td>
                                            <td>{entry.left ?? 'N/A'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </div>

                                <div className="scanner-workbench p-3">
                                  <h6 className="mb-2">Gate Setup</h6>
                                  <p className="small mb-3" style={{ opacity: 0.85 }}>
                                    Configure your gate scanning team for the event.
                                  </p>
                                  <Form onSubmit={handleGenerateScannerCodes}>
                                    <Row className="g-3 mb-3">
                                      <Col md={8}>
                                        <Form.Group controlId="scannerTeamDetails">
                                          <Form.Label className="small mb-1">Scanner team (one per line)</Form.Label>
                                          <Form.Control
                                            as="textarea"
                                            rows={4}
                                            value={scannerTeamText}
                                            onChange={(e) => setScannerTeamText(e.target.value)}
                                            placeholder={"Name, email, phone\nJohn Gate, john@example.com, +263...\nscanner2@example.com"}
                                          />
                                        </Form.Group>
                                      </Col>
                                      <Col md={4}>
                                        <Form.Group controlId="scannerMaxDevices">
                                          <Form.Label className="small mb-1">Max devices per code</Form.Label>
                                          <Form.Control
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={maxDevices}
                                            onChange={(e) => setMaxDevices(e.target.value)}
                                          />
                                        </Form.Group>
                                        <div className="d-grid mt-3">
                                          <Button type="submit" variant="outline-light" disabled={generatingCodes}>
                                            {generatingCodes ? 'Generating...' : 'Generate codes'}
                                          </Button>
                                        </div>
                                      </Col>
                                    </Row>
                                  </Form>

                                  {scannerCodeError && <Alert variant="danger" className="mb-2">{scannerCodeError}</Alert>}
                                  {scannerCodeSuccess && <Alert variant="success" className="mb-2">{scannerCodeSuccess}</Alert>}
                                  {generatedCodes.length > 0 && (
                                    <Alert variant="info" className="mb-0">
                                      <div className="fw-semibold mb-2">Generated scanner codes</div>
                                      {generatedCodes.map((codeInfo) => (
                                        <div key={codeInfo.id} className="small mb-1">
                                          {codeInfo.scanner?.name || codeInfo.scanner?.email}: <strong>{codeInfo.code}</strong>
                                        </div>
                                      ))}
                                    </Alert>
                                  )}
                                </div>
                              </div>
                            )}
                          </Col>
                        </Row>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default OrganizerDashboard;
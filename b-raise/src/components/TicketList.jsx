import { useEffect, useState } from 'react';
import { Row, Col, Badge, Button, Modal } from 'react-bootstrap';
import QRCode from 'react-qr-code';
import { API_ENDPOINTS } from '../config/api.js';

const statusVariant = (status) => {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Failed':
      return 'danger';
    default:
      return 'secondary';
  }
};

const TicketList = ({ orders, userEmail }) => {
  const hasOrders = orders && orders.length > 0;
  const [activeTicket, setActiveTicket] = useState(null);
  const [resendingOrderId, setResendingOrderId] = useState('');
  const [resendFeedback, setResendFeedback] = useState({ type: '', message: '' });
  const [showResendPopup, setShowResendPopup] = useState(false);

  useEffect(() => {
    if (!resendFeedback.message) return undefined;

    setShowResendPopup(true);
    const timer = window.setTimeout(() => {
      setShowResendPopup(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [resendFeedback.message]);

  const handleResendEmail = async (ticket) => {
    const orderId = String(ticket?.id || '').trim();
    if (!orderId) {
      setResendFeedback({ type: 'danger', message: 'Cannot resend email: missing order ID.' });
      return;
    }

    if (!userEmail) {
      setResendFeedback({ type: 'danger', message: 'Please sign in again to resend ticket email.' });
      return;
    }

    setResendingOrderId(orderId);
    setResendFeedback({ type: '', message: '' });

    try {
      const response = await fetch(API_ENDPOINTS.RESEND_TICKET_EMAIL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          email: userEmail,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to resend ticket email.');
      }

      setResendFeedback({
        type: 'success',
        message: `Ticket email sent to ${userEmail}.`,
      });
    } catch (err) {
      setResendFeedback({
        type: 'danger',
        message: err?.message || 'Failed to resend ticket email.',
      });
    } finally {
      setResendingOrderId('');
    }
  };

  // Flatten orders so each individual ticket is its own entry
  const tickets = (orders || []).flatMap((order) => {
    const perTicketPrice = order.quantity > 0 ? order.totalPaid / order.quantity : order.totalPaid;
    return Array.from({ length: order.quantity }).map((_, index) => ({
      ...order,
      quantity: 1,
      ticketIndex: index + 1,
      totalTicketsInOrder: order.quantity,
      perTicketPrice,
    }));
  });

  // Sort tickets so the most recently purchased tickets come first
  const sortedTickets = tickets.slice().sort((a, b) => {
    if (!a.purchasedAt && !b.purchasedAt) return 0;
    if (!a.purchasedAt) return 1;
    if (!b.purchasedAt) return -1;
    return b.purchasedAt.localeCompare(a.purchasedAt);
  });

  // Group tickets by event date, preserving the purchase-time order
  const { groupedByDate, dateOrder } = sortedTickets.reduce(
    (acc, ticket) => {
      const dateKey = ticket.eventDate;
      if (!acc.groupedByDate[dateKey]) {
        acc.groupedByDate[dateKey] = [];
        acc.dateOrder.push(dateKey);
      }
      acc.groupedByDate[dateKey].push(ticket);
      return acc;
    },
    { groupedByDate: {}, dateOrder: [] }
  );

  return (
    <>
      {!hasOrders && (
        <Row className="justify-content-center section-animate">
          <Col md={8}>
            <div className="p-4 contact-card text-center">
              <h5 className="mb-2">No tickets yet</h5>
              <p
                className="mb-3"
                style={{ fontSize: '0.95rem', opacity: 0.9 }}
              >
                When you buy tickets on B-host, they will all show up here with their
                details, QR codes, and payment status.
              </p>
            </div>
          </Col>
        </Row>
      )}

      {hasOrders && (
        <div className="section-animate">
        {resendFeedback.message && showResendPopup && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              right: '1rem',
              bottom: '1rem',
              zIndex: 2500,
              maxWidth: '360px',
              width: 'calc(100% - 2rem)',
              borderRadius: '12px',
              border: `1px solid ${resendFeedback.type === 'success' ? 'rgba(40, 167, 69, 0.5)' : 'rgba(220, 53, 69, 0.5)'}`,
              background: resendFeedback.type === 'success' ? 'rgba(25, 55, 35, 0.95)' : 'rgba(70, 20, 26, 0.95)',
              color: '#fff',
              boxShadow: '0 14px 28px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              padding: '0.8rem 0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.9rem' }}>{resendFeedback.message}</div>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setShowResendPopup(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  opacity: 0.9,
                }}
              >
                x
              </button>
            </div>
          </div>
        )}
        {dateOrder.map((dateKey) => (
          <div key={dateKey} className="mb-4">
            <Row className="mb-2">
              <Col>
                <div className="small text-uppercase text-muted fw-semibold">{dateKey}</div>
              </Col>
            </Row>
            <Row className="g-2">
              {groupedByDate[dateKey].map((ticket) => (
                <Col md={12} key={`${ticket.id}-${ticket.ticketIndex}`}>
                  <div
                    className="p-2 contact-card d-flex align-items-center justify-content-between"
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(14,14,14,0.85)',
                    }}
                  >
                    <div className="d-flex align-items-center flex-grow-1 me-3">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          overflow: 'hidden',
                          background:
                            'linear-gradient(135deg, rgba(255,0,60,0.35), rgba(255,255,255,0.08))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {ticket.eventImage ? (
                          <img
                            src={ticket.eventImage}
                            alt={ticket.eventName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          ticket.eventName
                            .split(' ')
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                        )}
                      </div>
                      <div className="ms-2 flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            className="small fw-semibold text-truncate"
                            style={{ maxWidth: '11rem' }}
                          >
                            {ticket.eventName}
                          </span>
                          <Badge
                            bg={statusVariant(ticket.status)}
                            pill
                            className="ms-2 text-uppercase"
                            style={{
                              fontSize: '0.65rem',
                              letterSpacing: '0.08em',
                              padding: '0.25rem 0.55rem',
                            }}
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        {ticket.eventArtist && (
                          <div className="small text-muted">
                            Artist: {ticket.eventArtist}
                          </div>
                        )}
                        {ticket.eventLineup && (
                          <div className="small text-muted">
                            Lineup: {ticket.eventLineup}
                          </div>
                        )}
                        <div className="small text-muted">
                          <i className="bi bi-geo-alt me-1" />
                          {ticket.venue}
                        </div>
                        <div className="small text-muted mt-0">
                          {ticket.ticketType} · ${ticket.perTicketPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex flex-column align-items-end small text-muted">
                      <span className="mb-1">
                        <i className="bi bi-clock me-1" />
                        {ticket.eventDate} · {ticket.eventTime}
                      </span>
                      <span className="mb-1">Purchased: {ticket.purchasedAt}</span>
                      {ticket.status === 'Pending' ? (
                        <div className="mt-1 d-flex gap-1">
                          <Button
                            variant="danger"
                            size="sm"
                            className="gradient-btn px-3"
                            onClick={() => ticket.handleBuyNow && ticket.handleBuyNow(ticket)}
                          >
                            Buy now
                          </Button>
                          <Button
                            variant="outline-light"
                            size="sm"
                            onClick={() => ticket.handleRemove && ticket.handleRemove(ticket.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-1 d-flex gap-1">
                          <Button
                            variant="outline-light"
                            size="sm"
                            onClick={() => setActiveTicket(ticket)}
                          >
                            View ticket
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="gradient-btn px-2"
                            onClick={() => handleResendEmail(ticket)}
                            disabled={resendingOrderId === ticket.id}
                          >
                            {resendingOrderId === ticket.id ? 'Sending...' : 'Resend to email'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        ))}
        </div>
      )}

      {activeTicket && (
        <Modal
          show={!!activeTicket}
          onHide={() => setActiveTicket(null)}
          centered
          size="sm"
        >
          <Modal.Header closeButton>
            <Modal.Title style={{ fontSize: '1rem' }}>Ticket details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-2">
              <div className="small text-muted mb-1">Event</div>
              <div className="fw-semibold">{activeTicket.eventName}</div>
            </div>
            <div className="mb-2 small">
              <div>
                <i className="bi bi-calendar-event me-1" />
                {activeTicket.eventDate} · {activeTicket.eventTime}
              </div>
              <div>
                <i className="bi bi-geo-alt me-1" />
                {activeTicket.venue}
              </div>
            </div>
            <div className="mb-2 small">
              Ticket: <strong>{activeTicket.ticketType}</strong>
              {activeTicket.totalTicketsInOrder > 1 && (
                <span className="text-muted ms-1">
                  (ticket {activeTicket.ticketIndex} of {activeTicket.totalTicketsInOrder})
                </span>
              )}
            </div>
            <div className="mb-2 small">
              Price: <strong>${activeTicket.perTicketPrice.toFixed(2)}</strong>
            </div>
            <div className="mb-2 small" style={{ color: '#ffffff' }}>
              Order ID: {activeTicket.id}
            </div>
            <div className="d-flex justify-content-center my-3">
              {activeTicket.qrData ? (
                <QRCode
                  value={activeTicket.qrData}
                  size={220}
                  level="M"
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: 16,
                    padding: 12,
                    backgroundColor: '#fff',
                  }}
                />
              ) : (
                <div
                  aria-label="Ticket QR code preview"
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 16,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background:
                      'repeating-linear-gradient(45deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06) 4px, transparent 4px, transparent 8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    textAlign: 'center',
                    padding: 8,
                    color: 'rgba(0,0,0,0.7)',
                    backgroundColor: '#fff',
                  }}
                >
                  QR code
                  <br />
                  will show here
                </div>
              )}
            </div>
            <div className="small text-center" style={{ color: '#ffffff' }}>
              This QR code can be scanned at the gate, or from the
              copy that is sent to your email.
            </div>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setActiveTicket(null)}
            >
              Close
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="gradient-btn"
              onClick={() => handleResendEmail(activeTicket)}
              disabled={resendingOrderId === activeTicket.id}
            >
              {resendingOrderId === activeTicket.id ? 'Sending...' : 'Resend to email'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default TicketList;

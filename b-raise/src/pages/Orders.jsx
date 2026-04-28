import { useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import TicketList from '../components/TicketList';
import { useOrders } from '../context/OrdersContext.jsx';
import { useAuth } from '../context/useAuth.js';
import { API_ENDPOINTS } from '../config/api';

const Orders = () => {
  const { orders, addOrder } = useOrders();
  const { user } = useAuth();

  useEffect(() => {
    const loadBackendTickets = async () => {
      if (!user || !user.email) return;

      try {
        const url = `${API_ENDPOINTS.USER_TICKETS}?email=${encodeURIComponent(
          user.email,
        )}`;
        const resp = await fetch(url);
        if (!resp.ok) return;

        const data = await resp.json();
        const backendTickets = data.tickets || [];

        backendTickets.forEach((ticket) => {
          const order = ticket.order || {};
          const qrData = ticket.qrData;

          if (!order.id) return;

          addOrder({
            ...order,
            qrData,
          });
        });
      } catch (err) {
        // Silent fail; local tickets will still show.
        console.error('Failed to load backend tickets', err);
      }
    };

    // Only try to load from backend if we have a logged-in user
    // and there are no tickets yet from local storage.
    if (user && orders.length === 0) {
      loadBackendTickets();
    }
  }, [user, orders.length, addOrder]);
  return (
    <div className="contact-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center mb-4 text-center section-animate">
          <Col lg={8}>
            <h1 className="mb-2 contact-hero-title">My Tickets</h1>
            <p
              className="mb-0 contact-hero-subtitle"
              style={{ fontSize: '0.95rem', opacity: 0.9 }}
            >
              All the tickets you&apos;ve purchased will appear here, in order. Later this will
              update live from your account in our database.
            </p>
          </Col>
        </Row>

        <TicketList orders={orders} userEmail={user?.email || ''} />
      </Container>
    </div>
  );
};

export default Orders;

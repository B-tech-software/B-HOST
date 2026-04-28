import { useState } from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useAuth } from '../context/useAuth.js';
import CheckoutModal from '../components/CheckoutModal.jsx';
import { processBackendPayment } from '../utils/payments';
import { recordTicketPurchase } from '../utils/ticketing';
import TicketList from '../components/TicketList.jsx';

const CartPage = () => {
  const { items, removeFromCart, clearCart, cartCount } = useCart();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkoutPayload, setCheckoutPayload] = useState(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const hasItems = items && items.length > 0;

  const totalAmount = items.reduce((sum, item) => {
    const price = Number(item.totalPaid) || 0;
    return sum + price * (item.quantity || 1);
  }, 0);


  const handleBuyNow = (order) => {
    setCheckoutError('');
    if (!user) {
      navigate('/auth', { state: { from: '/cart' } });
      return;
    }
    const event = {
      id: order.eventId || order.id,
      title: order.eventName,
      date: order.eventDate,
      startTime: order.eventTime,
      venue: order.venue,
      image: order.eventImage,
    };
    const option = {
      name: order.ticketType,
      description: 'Tickets from your cart.',
      // Use full line amount (price * quantity) as the base amount
      price: (order.totalPaid || 0) * (order.quantity || 1),
    };
    setCheckoutPayload({ order, event, option });
  };

  // Map cart items into the shape expected by TicketList (orders prop)
  const orders = items.map((item, index) => ({
    id: item.id || `CART-${index + 1}`,
    eventName: item.eventName,
    eventImage: item.eventImage || null,
    eventArtist: item.eventArtist || null,
    eventLineup: item.eventLineup || null,
    eventDate: item.eventDate || 'TBA',
    eventTime: item.eventTime || 'TBA',
    venue: item.venue || 'TBA',
    ticketType: item.ticketType || 'General',
    quantity: item.quantity || 1,
    totalPaid: item.totalPaid || 0,
    eventId: item.eventId || null,
    status: item.status || 'Pending',
    purchasedAt: 'Not paid yet',
    handleBuyNow: handleBuyNow,
    handleRemove: removeFromCart,
  }));

  const handleCloseCheckout = () => {
    setCheckoutError('');
    setIsProcessingCheckout(false);
    setCheckoutPayload(null);
  };

  const handleConfirmCheckout = async (summary) => {
    if (!checkoutPayload || !checkoutPayload.order || !checkoutPayload.event) return;

    setCheckoutError('');
    const quantity = checkoutPayload.order.quantity || 1;

    const baseOrder = {
      id: `ORD-${Date.now()}`,
      eventName: checkoutPayload.order.eventName,
      eventImage: checkoutPayload.order.eventImage,
      eventArtist: checkoutPayload.order.eventArtist,
      eventLineup: checkoutPayload.order.eventLineup,
      eventDate: checkoutPayload.order.eventDate,
      eventTime: checkoutPayload.order.eventTime,
      venue: checkoutPayload.order.venue,
      ticketType: checkoutPayload.order.ticketType,
      quantity,
      totalPaid:
        typeof summary?.totalAmount === 'number' && !Number.isNaN(summary.totalAmount)
          ? summary.totalAmount
          : checkoutPayload.order.totalPaid,
      basePrice:
        typeof summary?.baseAmount === 'number' && !Number.isNaN(summary.baseAmount)
          ? summary.baseAmount
          : checkoutPayload.option?.price || checkoutPayload.order.totalPaid,
      serviceFee: typeof summary?.serviceFee === 'number' ? summary.serviceFee : 0,
      platformFee: typeof summary?.platformFee === 'number' ? summary.platformFee : 0,
      vat: typeof summary?.vat === 'number' ? summary.vat : 0,
      paymentPlatformFee:
        typeof summary?.paymentPlatformFee === 'number' ? summary.paymentPlatformFee : 0,
      status: 'Paid',
    };

    setIsProcessingCheckout(true);

    try {
      await processBackendPayment({
        amount: baseOrder.totalPaid,
        orderId: baseOrder.id,
        user,
        paymentMethod: 'simulated',
      });

      const { qrData } = await recordTicketPurchase({
        order: baseOrder,
        eventId: checkoutPayload.order.eventId || checkoutPayload.event.id,
        user,
      });

      addOrder({
        ...baseOrder,
        qrData,
      });

      removeFromCart(checkoutPayload.order.id);
      setCheckoutPayload(null);
    } catch (err) {
      console.error('Cart checkout failed:', err);
      setCheckoutError(
        err?.message || 'Could not complete checkout. Please try again.'
      );
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="contact-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        {/* Cart header and summary */}
        <Row className="justify-content-center mb-4 text-center section-animate">
          <Col lg={8}>
            <h1 className="mb-2 contact-hero-title">Cart</h1>
            <p className="mb-0 contact-hero-subtitle" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
              Tickets you have added but not paid for will appear here.
            </p>
          </Col>
        </Row>

        {/* Always visible Clear Cart button for cart tickets */}
        {hasItems && (
          <Row className="mb-3 section-animate">
            <Col xs={12} className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                className="fw-bold"
                style={{ color: '#fff', borderColor: '#fff', minWidth: 120 }}
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </Col>
          </Row>
        )}

        {/* Cart items */}
        {hasItems && (
          <Row className="section-animate mt-3">
            <Col md={12}>
              {checkoutError && (
                <div className="alert alert-danger" role="alert">
                  {checkoutError}
                </div>
              )}
              <TicketList orders={orders} />
            </Col>
          </Row>
        )}

        {/* Empty cart message */}
        {!hasItems && (
          <Row className="justify-content-center section-animate">
            <Col md={8}>
              <div className="p-4 contact-card text-center">
                <h5 className="mb-2">Your cart is empty</h5>
                <p className="mb-3" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                  Add tickets from Available Events and they will show here until you pay.
                </p>
              </div>
            </Col>
          </Row>
        )}

        <CheckoutModal
          isOpen={!!checkoutPayload}
          event={checkoutPayload?.event}
          option={checkoutPayload?.option}
          onClose={handleCloseCheckout}
          onConfirm={handleConfirmCheckout}
          isProcessing={isProcessingCheckout}
        />
      </Container>
    </div>
  );
};

export default CartPage;

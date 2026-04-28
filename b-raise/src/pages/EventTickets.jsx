import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { useAuth } from '../context/useAuth.js';
import CheckoutModal from '../components/CheckoutModal.jsx';
import { buildTicketOptions } from '../utils/tickets';
import { processBackendPayment } from '../utils/payments';
import { recordTicketPurchase } from '../utils/ticketing';
import { isPublicEventStatus } from '../utils/events.js';

const EventTickets = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { addToCart } = useCart();
  const { addOrder } = useOrders();
  const [checkoutOption, setCheckoutOption] = useState(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  // Tracks which free ticket option (by id) is currently being processed
  // when the user clicks "Buy now" for a free event.
  const [processingFreeOptionId, setProcessingFreeOptionId] = useState(null);
  // Track selected ticket type
  const [selectedTicketId, setSelectedTicketId] = useState('');
  // Track selected quantity
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [purchaseError, setPurchaseError] = useState('');
  const { user } = useAuth();

  const getPurchaseErrorMessage = (err, fallbackMessage) => {
    const technicalNetworkMessages = [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource.',
    ];

    if (technicalNetworkMessages.includes(err?.message)) {
      return 'We could not reach the server. Please check your internet connection and try again.';
    }

    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    return fallbackMessage;
  };

  // Prefer event data passed via navigation state
  const eventFromState = location.state && location.state.event;

  const event = useMemo(() => {
    if (eventFromState) {
      return isPublicEventStatus(eventFromState.status) ? eventFromState : null;
    }
    // If user navigated directly via URL without state, we can show a simple fallback.
    if (!eventId) return null;
    return null;
  }, [eventFromState, eventId]);

  const ticketOptions = useMemo(() => buildTicketOptions(event), [event]);

  const handleAddToCart = (option) => {
    if (!event) return;
    const quantity = option.quantity || 1;
    addToCart({
      id: `event-${event.id}-${option.id}`,
      eventId: event.id,
      eventName: event.title,
      eventImage: event.image,
      eventArtist: event.artist,
      eventLineup: event.lineup,
      eventDate: event.date,
      eventTime: event.startTime || 'TBA',
      venue: event.venue,
      ticketType: option.name,
      totalPaid: option.price * quantity,
      status: 'Pending',
      quantity,
    });
  };

  const handleBuyNow = async (option) => {
    setPurchaseError('');
    if (!user) {
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    const quantity = option.quantity || 1;
    // For free tickets, skip payment and just record the order
    if (option.price === 0) {
      if (!event) return;

      setProcessingFreeOptionId(option.id);

      const orderId = `ORD-${Date.now()}`;
      const baseOrder = {
        id: orderId,
        eventName: event.title,
        eventImage: event.image,
        eventArtist: event.artist,
        eventLineup: event.lineup,
        eventDate: event.date,
        eventTime: event.startTime || 'TBA',
        venue: event.venue,
        ticketType: option.name,
        quantity,
        totalPaid: 0,
        basePrice: 0,
        serviceFee: 0,
        platformFee: 0,
        status: 'Free',
      };

      let success = false;
      try {
        const { qrData } = await recordTicketPurchase({
          order: baseOrder,
          eventId: event.id,
          user,
        });
        addOrder({
          ...baseOrder,
          qrData,
        });
        success = true;
      } catch (err) {
        console.error('Error recording free ticket purchase:', err);
        setPurchaseError(
          getPurchaseErrorMessage(
            err,
            'Could not complete your ticket request. Please try again later.'
          )
        );
      } finally {
        setProcessingFreeOptionId(null);
      }
      if (success) {
        navigate('/orders');
      }
      return;
    }

    // Paid tickets go through the normal checkout flow
    setCheckoutOption({ ...option, quantity });
  };

  const handleCloseCheckout = () => {
    setIsProcessingCheckout(false);
    setCheckoutOption(null);
  };

  const handleConfirmCheckout = async (summary) => {
    setPurchaseError('');
    if (!checkoutOption || !event) return;

    const { totalAmount, baseAmount, serviceFee, platformFee, vat, paymentPlatformFee } = summary || {};
    const quantity = checkoutOption.quantity || 1;

    const orderId = `ORD-${Date.now()}`;

    const baseOrder = {
      id: orderId,
      eventName: event.title,
      eventImage: event.image,
      eventArtist: event.artist,
      eventLineup: event.lineup,
      eventDate: event.date,
      eventTime: event.startTime || 'TBA',
      venue: event.venue,
      ticketType: checkoutOption.name,
      quantity,
      totalPaid:
        typeof totalAmount === 'number' && !Number.isNaN(totalAmount)
          ? totalAmount
          : checkoutOption.price * quantity,
      basePrice: typeof baseAmount === 'number' ? baseAmount : checkoutOption.price,
      serviceFee: typeof serviceFee === 'number' ? serviceFee : 0,
      platformFee: typeof platformFee === 'number' ? platformFee : 0,
      vat: typeof vat === 'number' ? vat : 0,
      paymentPlatformFee: typeof paymentPlatformFee === 'number' ? paymentPlatformFee : 0,
      status: 'Paid',
    };

    setIsProcessingCheckout(true);

    let success = false;
    try {
      await processBackendPayment({
        amount: baseOrder.totalPaid,
        orderId: baseOrder.id,
        user,
        paymentMethod: 'simulated',
      });

      const { qrData } = await recordTicketPurchase({
        order: baseOrder,
        eventId: event.id,
        user,
      });
      addOrder({
        ...baseOrder,
        qrData,
      });
      success = true;
    } catch (err) {
      console.error('Error recording paid ticket purchase:', err);
      setPurchaseError(
        getPurchaseErrorMessage(
          err,
          'Could not complete your ticket purchase. Please try again later.'
        )
      );
    } finally {
      setIsProcessingCheckout(false);
    }
    setCheckoutOption(null);
    if (success) {
      navigate('/orders');
    }
  };

  if (!event) {
    return (
      <section className="py-5">
        <div className="container">
          <div className="contact-card p-4 text-center">
            <h4 className="mb-2">Event not available</h4>
            <p className="mb-3" style={{ opacity: 0.9 }}>
              This event is either waiting for owner approval or could not be loaded.
              Please go back and choose a different event.
            </p>
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={() => navigate('/')}
            >
              Back to events
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-5">
        <div className="container">
        {purchaseError && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
            <span>{purchaseError}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => setPurchaseError('')}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="mb-4">
          <button
            type="button"
            className="btn btn-outline-light btn-sm mb-3"
            onClick={() => navigate(-1)}
          >
            &larr; Back
          </button>
          <div className="row g-3 align-items-stretch">
            <div className="col-md-5">
              <div
                className="contact-card h-100 p-0 overflow-hidden"
                style={{ borderRadius: 16 }}
              >
                {event.image && (
                  <div style={{ width: '100%', height: 220, overflow: 'hidden' }}>
                    <img
                      src={event.image}
                      alt={event.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div className="p-3">
                  <h2 className="mb-1" style={{ fontSize: '1.4rem' }}>
                    {event.title}
                  </h2>
                  {event.artist && (
                    <p className="mb-1 small" style={{ opacity: 0.9 }}>
                      Featuring {event.artist}
                    </p>
                  )}
                  <p className="mb-1 small" style={{ opacity: 0.9 }}>
                    {event.date}
                  </p>
                  {event.startTime && (
                    <p className="mb-1 small" style={{ opacity: 0.9 }}>
                      Starts at {event.startTime}
                    </p>
                  )}
                  <p className="mb-1 small" style={{ opacity: 0.9 }}>
                    {event.venue}
                  </p>
                  {event.lineup && (
                    <p className="mb-2 small" style={{ opacity: 0.9 }}>
                      Lineup: {event.lineup}
                    </p>
                  )}
                  {event.description && (
                    <p className="mb-2 small" style={{ opacity: 0.9 }}>
                      {event.description}
                    </p>
                  )}
                  {event.price && (
                    <span className="badge bg-danger" style={{ fontSize: '0.8rem' }}>
                      From {event.price}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-7 d-flex align-items-center">
              <div className="w-100 contact-card p-3">
                <h5 className="mb-2">Choose your tickets</h5>
                <p className="small mb-0" style={{ opacity: 0.9 }}>
                  Select the ticket type and quantity that works best for you.
                  You can add to cart and pay later, or buy now and go straight
                  to checkout.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12">
            <div className="row g-3">
              {ticketOptions.map((option) => (
                <div key={option.id} className="col-md-4">
                  <div
                    className={`contact-card p-3 h-100 d-flex flex-column position-relative ticket-radio-card ${selectedTicketId === option.id ? 'border border-danger border-2 shadow' : ''}`}
                    style={{ cursor: 'pointer', borderRadius: 12 }}
                    onClick={() => {
                      if (selectedTicketId === option.id) {
                        setSelectedTicketId('');
                        setSelectedQuantity(1);
                      } else {
                        setSelectedTicketId(option.id);
                        setSelectedQuantity(1);
                      }
                    }}
                  >
                    <input
                      className="form-check-input position-absolute"
                      style={{ top: 16, right: 16, zIndex: 2, width: 20, height: 20, cursor: 'pointer' }}
                      type="radio"
                      name="ticketType"
                      id={`ticketType-${option.id}`}
                      value={option.id}
                      checked={selectedTicketId === option.id}
                      onChange={() => {
                        if (selectedTicketId === option.id) {
                          setSelectedTicketId('');
                          setSelectedQuantity(1);
                        } else {
                          setSelectedTicketId(option.id);
                          setSelectedQuantity(1);
                        }
                      }}
                    />
                    <div className="flex-grow-1">
                      <h5 className="mb-1">{option.name}</h5>
                      <p className="small mb-2" style={{ opacity: 0.9 }}>{option.description}</p>
                    </div>
                    <span className="fw-semibold mt-auto" style={{ fontSize: '1.1rem' }}>
                      {option.price === 0 ? 'Free' : `US$${option.price.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 d-flex flex-wrap align-items-end gap-3">
              <div>
                <label htmlFor="ticket-quantity" className="form-label mb-1">Quantity</label>
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    id="ticket-quantity"
                    type="number"
                    min={1}
                    max={selectedTicketId ? (ticketOptions.find(opt => opt.id === selectedTicketId)?.maxQuantity || 10) : 10}
                    value={selectedQuantity}
                    onChange={e => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-control border border-danger fw-bold text-center"
                    style={{ width: 110, fontSize: '1.1rem', boxShadow: '0 0 0 2px #ff003c33' }}
                    disabled={!selectedTicketId}
                  />
                  <span style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.9rem',
                    color: '#ff003c',
                    pointerEvents: 'none',
                    opacity: 0.85
                  }}>
                    &#8597;
                  </span>
                </div>
                <div className="small text-danger mt-1" style={{ fontSize: '0.85rem' }}>
                  You can change the quantity
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                disabled={!selectedTicketId}
                onClick={() => {
                  const option = ticketOptions.find(opt => opt.id === selectedTicketId);
                  if (option) handleAddToCart({ ...option, quantity: selectedQuantity });
                }}
              >
                Add to cart
              </button>
              <button
                type="button"
                className="btn btn-danger gradient-btn btn-sm"
                disabled={!selectedTicketId || (ticketOptions.find(opt => opt.id === selectedTicketId)?.price === 0 && processingFreeOptionId === selectedTicketId)}
                onClick={() => {
                  const option = ticketOptions.find(opt => opt.id === selectedTicketId);
                  if (option) handleBuyNow({ ...option, quantity: selectedQuantity });
                }}
              >
                {selectedTicketId && ticketOptions.find(opt => opt.id === selectedTicketId)?.price === 0 && processingFreeOptionId === selectedTicketId ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Processing...
                  </>
                ) : (
                  'Buy now'
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </section>

      <CheckoutModal
        isOpen={!!checkoutOption}
        event={event}
        option={checkoutOption}
        onClose={handleCloseCheckout}
        onConfirm={handleConfirmCheckout}
        isProcessing={isProcessingCheckout}
      />
    </>
  );
};

export default EventTickets;

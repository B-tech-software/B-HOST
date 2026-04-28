import React from 'react';

const CheckoutModal = ({
  isOpen,
  event,
  option,
  onClose = () => {},
  onConfirm = () => {},
  // When true, the primary button shows a loading state while the
  // backend/Firebase work is in progress.
  isProcessing = false,
}) => {
  if (!isOpen || !event || !option) return null;



  const isFree = option.price === 0;
  const quantity = option.quantity || 1;
  const baseAmount = option.price || 0;
  const subtotal = baseAmount * quantity;

  // Platform fee: 5% of subtotal
  const platformFee = isFree ? 0 : +(subtotal * 0.05).toFixed(2);
  // VAT: 7.5% of (subtotal + platformFee)
  const vat = isFree ? 0 : +((subtotal + platformFee) * 0.075).toFixed(2);
  // Payment platform fee: 1.5% of (subtotal + platformFee + vat) + $0.50
  const paymentPlatformFee = isFree ? 0 : +(((subtotal + platformFee + vat) * 0.015) + 0.5).toFixed(2);

  const totalAmount = isFree ? 0 : +(subtotal + platformFee + vat + paymentPlatformFee).toFixed(2);

  const buildSummary = () => ({
    baseAmount,
    platformFee,
    vat,
    paymentPlatformFee,
    totalAmount,
    quantity,
  });

  const handlePrimaryClick = () => {
    if (isProcessing) return;
    onConfirm(buildSummary());
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="checkout-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="checkout-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contact-card p-4 checkout-modal-card">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h4 className="mb-1">Confirm ticket</h4>
              <p className="mb-0 small" style={{ opacity: 0.85 }}>
                Confirm your {isFree ? 'RSVP' : 'ticket'} for this event.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={handleClose}
            >
              Close
            </button>
          </div>

          <div className="checkout-modal-summary mb-3">
            <div className="d-flex gap-3 align-items-center mb-2">
              {event.image && (
                <div className="checkout-modal-image-wrapper">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="checkout-modal-image"
                  />
                </div>
              )}
              <div>
                <h5 className="mb-1" style={{ fontSize: '1rem' }}>
                  {event.title}
                </h5>
                <p className="mb-0 small" style={{ opacity: 0.9 }}>
                  {event.date}
                  {event.startTime && ` • ${event.startTime}`}
                </p>
                <p className="mb-0 small" style={{ opacity: 0.9 }}>
                  {event.venue}
                </p>
              </div>
            </div>

            <div className="checkout-modal-ticket-line d-flex justify-content-between align-items-center">
              <div>
                <span className="fw-semibold">{option.name}</span>
                <p className="mb-0 small" style={{ opacity: 0.85 }}>
                  {quantity} x ticket{quantity > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-end">
                <span className="fw-semibold">
                  {isFree ? 'Free' : `US$${(option.price * quantity).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="checkout-modal-footer d-flex flex-column gap-2">
            <div className="small mb-1">
              <div className="d-flex justify-content-between">
                <span>Ticket price</span>
                <span>{isFree ? 'Free' : `US$${baseAmount.toFixed(2)} x ${quantity}`}</span>
              </div>
              {!isFree && (
                <>
                  <div className="d-flex justify-content-between">
                    <span>Subtotal</span>
                    <span>{`US$${subtotal.toFixed(2)}`}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Platform fee (5%)</span>
                    <span>{`US$${platformFee.toFixed(2)}`}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>VAT (7.5%)</span>
                    <span>{`US$${vat.toFixed(2)}`}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Payment platform fee</span>
                    <span>{`US$${paymentPlatformFee.toFixed(2)}`}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold mt-2">
                    <span>Total</span>
                    <span>{`US$${totalAmount.toFixed(2)}`}</span>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-danger gradient-btn w-100 mt-1"
              onClick={handlePrimaryClick}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Processing...
                </>
              ) : (
                isFree ? 'Confirm RSVP' : 'Confirm ticket'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;

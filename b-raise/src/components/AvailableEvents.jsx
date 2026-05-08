import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featuredEvents } from '../data/featuredEvents.js';

const AvailableEvents = ({ events = featuredEvents, loading = false, showEmptyState = true }) => {
  const scrollRef = useRef(null);
  const [isViewAll, setIsViewAll] = useState(false);
  const navigate = useNavigate();

  const scrollByPage = (direction) => {
    if (!scrollRef.current || isViewAll) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollBy({
      left: direction * clientWidth,
      behavior: 'smooth',
    });
  };

  const handleViewAll = () => {
    setIsViewAll(true);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleViewLess = () => {
    setIsViewAll(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="available-events-section py-4 py-lg-5">
      <div className="container">
        <div className="available-events-header d-flex justify-content-between align-items-center mb-3 mb-lg-4">
          <div>
            <h2 className="available-events-title mb-1">Available Events</h2>
            <p className="available-events-subtitle mb-0">
              Discover what&apos;s happening now and grab your spot.
            </p>
          </div>
          <div className="available-events-nav">
            {!isViewAll && (
              <>
                <button
                  type="button"
                  className="available-events-nav-btn d-none d-md-inline-flex"
                  onClick={() => scrollByPage(-1)}
                  aria-label="Previous events"
                >
                  &#8249;
                </button>
                <button
                  type="button"
                  className="available-events-nav-btn d-none d-md-inline-flex"
                  onClick={() => scrollByPage(1)}
                  aria-label="Next events"
                >
                  &#8250;
                </button>
                <button
                  type="button"
                  className="btn btn-outline-light d-none d-md-inline-flex ms-2"
                  onClick={handleViewAll}
                >
                  View all
                </button>
              </>
            )}
            {isViewAll && (
              <button
                type="button"
                className="btn btn-outline-light d-none d-md-inline-flex ms-2"
                onClick={handleViewLess}
              >
                View less
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading events...</span>
            </div>
            <p className="mt-3 mb-0">Loading events...</p>
          </div>
        )}

        {!loading && showEmptyState && events.length === 0 && (
          <div className="text-center py-4">
            <h2 className="mb-0">No events are available yet</h2>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div
            ref={scrollRef}
            className={`available-events-scroll ${
              isViewAll ? 'available-events-scroll--all' : ''
            }`}
          >
            {events.map((event) => {
              const isFree = event.isFree || String(event.price).toLowerCase().includes('free');

              return (
                <article key={event.id} className="available-event-card">
                  <div className="available-event-image-wrapper">
                    <img src={event.image} alt={event.title} className="available-event-image" />
                    <div className="available-event-price-stack">
                      <span
                        className={`available-event-price-badge${
                          isFree ? ' available-event-price-badge--free' : ''
                        }`}
                      >
                        {isFree ? 'Free event' : event.price}
                      </span>
                    </div>
                  </div>
                  <div className="available-event-body">
                    <h3 className="available-event-title">{event.title}</h3>
                    <p className="available-event-meta mb-1">{event.date}</p>
                    <p className="available-event-meta available-event-venue mb-2">{event.venue}</p>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-danger gradient-btn w-100"
                        onClick={() =>
                          navigate(`/events/${event.id}/tickets`, {
                            state: { event },
                          })
                        }
                      >
                        {isFree ? 'Get tickets' : 'Buy tickets'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default AvailableEvents;

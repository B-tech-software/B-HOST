import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Temporary sample data; later you can replace this with data from your API
const sampleEvents = [
  {
    id: 1,
    title: 'Summer Vibes Festival',
    date: 'Sat, 22 Mar 2025',
    venue: 'Harare International Conference Centre',
    price: 'US$20.00',
    image:
      'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 2,
    title: 'Afro Beats Night',
    date: 'Fri, 04 Apr 2025',
    artist: 'Afro Beats All Stars',
    lineup: 'DJ Tinashe, Ami Faku, Jah Prayzah',
    startTime: '19:30',
    venue: 'B-Host Arena, Borrowdale',
    price: 'US$15.00',
    image:
      'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 3,
    title: 'Tech & Creators Meetup',
    date: 'Thu, 10 Apr 2025',
    artist: 'Various Artists',
    lineup: 'Headliners + surprise guests',
    startTime: '14:00',
    venue: 'Innovation Hub, Mt Pleasant',
    price: 'Free RSVP',
    image:
      'https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 4,
    title: 'Gospel Night of Worship',
    date: 'Sun, 27 Apr 2025',
    artist: 'Community Speakers',
    lineup: 'Founders, creators, and tech leaders',
    startTime: '17:00',
    venue: 'City Sports Centre',
    price: 'US$10.00',
    image:
      'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 5,
    title: 'City Lights Live Concert',
    date: 'Sat, 03 May 2025',
    artist: 'Worship Collective',
    lineup: 'Local and regional worship leaders',
    startTime: '18:00',
    venue: 'National Arts Gallery, Harare',
    price: 'US$18.00',
    image:
      'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 6,
    title: 'House & Lounge Sessions',
    date: 'Fri, 09 May 2025',
    artist: 'City Lights Band',
    lineup: 'Opening acts + City Lights',
    startTime: '19:00',
    venue: 'Skyline Rooftop, CBD',
    price: 'US$12.00',
    image:
      'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 7,
    title: 'Comedy & Chill Night',
    date: 'Thu, 15 May 2025',
    artist: 'Resident DJs',
    lineup: 'DJ Kim, DJ Sky, special guests',
    startTime: '20:00',
    venue: 'Theatre in the Park',
    price: 'US$8.00',
    image:
      'https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 8,
    title: 'B-raise Creators Hangout',
    date: 'Sat, 24 May 2025',
    artist: 'Stand-up Collective',
    lineup: 'Top local comedians',
    startTime: '19:00',
    venue: 'Innovation Hub, Mt Pleasant',
    price: 'Free RSVP',
    image:
      'https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 9,
    title: 'Sunset Acoustic Sessions',
    date: 'Sun, 01 Jun 2025',
    artist: 'Creators Community',
    lineup: 'Panels, live sessions, networking',
    startTime: '10:00',
    venue: 'Lake Chivero Waterfront',
    price: 'US$14.00',
    image:
      'https://images.pexels.com/photos/144428/pexels-photo-144428.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 10,
    title: 'Startup Pitch Night',
    date: 'Wed, 04 Jun 2025',
    venue: 'Innovation Hub, Mt Pleasant',
    price: 'Free RSVP',
    image:
      'https://images.pexels.com/photos/1181400/pexels-photo-1181400.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 11,
    title: 'Zim Hip-Hop Cypher',
    date: 'Fri, 06 Jun 2025',
    venue: 'Downtown Culture Centre',
    price: 'US$7.00',
    image:
      'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 12,
    title: 'Afro Jazz & Wine Night',
    date: 'Sat, 14 Jun 2025',
    venue: 'Borrowdale Village Gardens',
    price: 'US$25.00',
    image:
      'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const AvailableEvents = ({ events = sampleEvents, loading = false, showEmptyState = true }) => {
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

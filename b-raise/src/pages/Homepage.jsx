import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase.js';
import SearchBar from '../components/SearchBar';
import EventCategories from '../components/EventCategories';
import AvailableEvents from '../components/AvailableEvents';
import { isPublicEventStatus, normalizeEventStatus } from '../utils/events.js';
import { featuredEvents } from '../data/featuredEvents.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200';

const Homepage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      if (!isFirebaseConfigured || !db) {
        setEvents(featuredEvents);
        setLoading(false);
        return;
      }

      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const docs = snapshot.docs.map((doc) => {
          const data = doc.data() || {};
          const dateLabel = data.dateLabel || data.date || '';
          const priceLabel =
            data.priceLabel ||
            (typeof data.ticketPrice === 'number' && data.ticketPrice > 0
              ? `US$${data.ticketPrice.toFixed(2)}`
              : 'Free RSVP');

          return {
            // core identifiers
            id: doc.id,
            status: normalizeEventStatus(data.status || 'draft'),

            // main card fields
            title: data.title || 'Untitled event',
            date: dateLabel,
            venue: data.venue || '',
            artist: data.artist || '',
            lineup: data.lineup || '',
            startTime: data.startTime || '',
            price: priceLabel,
            image: data.imageUrl || data.image || FALLBACK_IMAGE,

            // extra details saved from the host form
            category: data.category || '',
            description: data.description || '',
            isFree: !!data.isFree,
            freeTicketQuantity: data.freeTicketQuantity || '',
            ticketPrice: typeof data.ticketPrice === 'number' ? data.ticketPrice : 0,
            tickets: data.tickets || {
              basic: { price: '', quantity: '' },
              vip: { price: '', quantity: '' },
              vvip: { price: '', quantity: '' },
            },
          };
        }).filter((event) => isPublicEventStatus(event.status));

        setEvents(docs.length > 0 ? docs : featuredEvents);
      } catch (err) {
        console.error('Error loading events for homepage from Firestore:', err);
        setEvents(featuredEvents);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);


  // Filter events by category and search query
  const filterEvents = (evts, query, category) => {
    let filtered = evts;
    if (category) {
      filtered = filtered.filter((evt) => evt.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (evt) =>
          evt.title.toLowerCase().includes(q) ||
          (evt.artist && evt.artist.toLowerCase().includes(q)) ||
          (evt.venue && evt.venue.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  const filteredEvents = filterEvents(events, searchQuery, selectedCategory);

  // Autocomplete suggestions for search bar
  const handleSearchInput = (input) => {
    setSearchQuery(input);
    if (!input) {
      setSuggestions([]);
      return;
    }
    const q = input.toLowerCase();
    // Collect unique suggestions from title, artist, and venue
    const allSuggestions = [
      ...new Set(
        events
          .flatMap((evt) => [evt.title, evt.artist, evt.venue])
          .filter(Boolean)
          .filter((val) => val.toLowerCase().includes(q))
      ),
    ];
    setSuggestions(allSuggestions.slice(0, 6));
  };

  const handleSearch = async (query) => {
    setSearchLoading(true);
    setSearchQuery(query);
    setSuggestions([]);
    // Simulate async search delay for UX (remove if using real API)
    await new Promise((res) => setTimeout(res, 400));
    setSearchLoading(false);
  };

  return (
    <div className="homepage-hero" style={{ background: '#181818', minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center text-center">
          <Col lg={8}>
            <h1
              className="homepage-hero-title"
              style={{
                fontWeight: 900,
                fontFamily:
                  'SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
                letterSpacing: '2px',
                background: 'linear-gradient(90deg, #fff 60%, #ff003c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textFillColor: 'transparent',
              }}
            >
              Your Number One Event Hosting Platform
            </h1>
            <p className="homepage-hero-subtitle">
              Buy, Sell, and Share Tickets with a Vibrant Community of Event Lovers.
            </p>
          </Col>
        </Row>
        <Row className="justify-content-center homepage-search-row">
          <Col lg={8}>
            <div style={{ position: 'relative' }}>
              <SearchBar
                onSearch={handleSearch}
                onInputChange={handleSearchInput}
                value={searchQuery}
                loading={searchLoading}
              />
              {suggestions.length > 0 && (
                <ul
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    background: '#232323',
                    color: '#fff',
                    borderRadius: '0 0 8px 8px',
                    margin: 0,
                    padding: '0.5rem 0',
                    listStyle: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
                      onMouseDown={() => handleSearch(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Col>
        </Row>
        <Row>
          <Col>
            <EventCategories
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </Col>
        </Row>
      </Container>
      <AvailableEvents
        events={filteredEvents}
        loading={loading}
        showEmptyState={!searchQuery && filteredEvents.length > 0}
      />
      {!loading && filteredEvents.length === 0 && searchQuery && (
        <div className="text-center py-4">
          <h2 className="mb-0" style={{ color: '#fff' }}>No results found for "{searchQuery}"</h2>
        </div>
      )}
    </div>
  );
};

export default Homepage;

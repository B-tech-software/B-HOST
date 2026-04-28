import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import AvailableEvents from '../components/AvailableEvents';
import { isPublicEventStatus, normalizeEventStatus } from '../utils/events.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
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

        setEvents(docs);
      } catch (err) {
        console.error('Error loading events from Firestore:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  return <AvailableEvents events={events} loading={loading} />;
};

export default Events;

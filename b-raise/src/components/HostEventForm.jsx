import { useEffect, useState } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase.js';
import { API_ENDPOINTS } from '../config/api.js';
import { useAuth } from '../context/useAuth.js';
import { eventCategories } from './EventCategories.jsx';

const initialFormData = {
  title: '',
  category: '',
  date: '',
  time: '',
  venue: '',
  artist: '',
  lineup: '',
  imageUrl: '',
  // legacy single price (optional if you want a base price)
  ticketPrice: '',
  isFree: false,
  freeTicketQuantity: '',
  description: '',
  tickets: {
    basic: { price: '', quantity: '' },
    vip: { price: '', quantity: '' },
    vvip: { price: '', quantity: '' },
  },
};

const HostEventForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [organizerStatus, setOrganizerStatus] = useState(null);
  const [organizerLoading, setOrganizerLoading] = useState(true);
  const [organizerForm, setOrganizerForm] = useState({
    organizationName: '',
    organizerEmail: user?.email || '',
    phone: '',
    address: '',
  });
  const [registeringOrganizer, setRegisteringOrganizer] = useState(false);

  useEffect(() => {
    const loadOrganizerStatus = async () => {
      if (!user?.uid) {
        setOrganizerStatus(null);
        setOrganizerLoading(false);
        return;
      }

      try {
        setOrganizerLoading(true);
        const response = await fetch(
          `${API_ENDPOINTS.ORGANIZER_STATUS}?uid=${encodeURIComponent(user.uid)}`
        );
        const data = await response.json();
        setOrganizerStatus(data?.status || null);

        if (data?.organizer) {
          setOrganizerForm({
            organizationName: data.organizer.organizationName || '',
            organizerEmail: data.organizer.organizerEmail || data.organizer.email || user?.email || '',
            phone: data.organizer.phone || '',
            address: data.organizer.address || '',
          });
        } else {
          setOrganizerForm((prev) => ({
            ...prev,
            organizerEmail: prev.organizerEmail || user?.email || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load organizer status:', err);
        setOrganizerStatus(null);
      } finally {
        setOrganizerLoading(false);
      }
    };

    loadOrganizerStatus();
  }, [user]);

  const handleOrganizerRegistration = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in first to register as an event organizer.');
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      setRegisteringOrganizer(true);
      const response = await fetch(API_ENDPOINTS.ORGANIZER_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          organizerEmail: organizerForm.organizerEmail,
          displayName: user.displayName || '',
          organizationName: organizerForm.organizationName,
          phone: organizerForm.phone,
          address: organizerForm.address,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Could not submit organizer registration.');
      }

      setOrganizerStatus(payload?.organizer?.status || 'pending');
      setSuccessMessage('Organizer registration submitted. Your account is now pending approval.');
    } catch (err) {
      console.error('Organizer registration failed:', err);
      setError(err.message || 'Failed to register organizer profile.');
    } finally {
      setRegisteringOrganizer(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTicketChange = (type, field, value) => {
    setFormData((prev) => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        [type]: {
          ...prev.tickets[type],
          [field]: value,
        },
      },
    }));
  };

  const handlePosterFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPosterFile(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!user?.uid) {
      setError('Please sign in first to add an event.');
      return;
    }

    if (organizerStatus !== 'approved') {
      setError('Your organizer account must be approved before you can add events.');
      return;
    }

    if (formData.isFree) {
      if (String(formData.freeTicketQuantity || '').trim() === '') {
        setError('Please enter the number of free tickets available.');
        return;
      }
    } else {
      const missingTier = ['basic', 'vip', 'vvip'].find(
        (tier) => String(formData.tickets?.[tier]?.quantity || '').trim() === ''
      );

      if (missingTier) {
        setError('Please enter ticket capacity for Basic, VIP, and VVIP before saving the event.');
        return;
      }
    }

    setUploading(true);

    try {
      const numericTicketPrice = formData.ticketPrice
        ? parseFloat(formData.ticketPrice)
        : 0;

      const dateLabel = formData.date && formData.time
        ? `${formData.date} ${formData.time}`
        : formData.date || '';

      let imageUrl = formData.imageUrl || '';

      // If a poster file was selected, upload it and use its URL.
      // Use a user-scoped path to align with common Firebase Storage rules.
      if (posterFile) {
        try {
          const safeFileName = String(posterFile.name || 'poster.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageRef = ref(
            storage,
            `event-posters/${user.uid}/${Date.now()}-${safeFileName}`
          );
          const snapshot = await uploadBytes(storageRef, posterFile);
          imageUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          const uploadCode = String(uploadErr?.code || '');
          const uploadMessage = String(uploadErr?.message || '');

          if (uploadCode === 'storage/unauthorized') {
            throw new Error(
              'Poster upload permission denied in Firebase Storage. Your event was not saved with this image. Update Storage rules or save without poster image.'
            );
          }

          throw new Error(uploadMessage || 'Failed to upload poster image. Please try again.');
        }
      }

      const finalTicketPrice = formData.isFree
        ? 0
        : Number.isFinite(numericTicketPrice)
          ? numericTicketPrice
          : 0;

      const eventData = {
        ...formData,
        ticketPrice: finalTicketPrice,
        imageUrl,
        dateLabel,
        createdBy: user.uid,
        createdByEmail: user.email || '',
        // ensure tickets page sees a startTime field
        startTime: formData.time || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'draft',
      };

      await addDoc(collection(db, 'events'), eventData);

      setSuccessMessage('Your event has been saved successfully. You can add scanner team and generate codes later.');
      setFormData(initialFormData);
      setPosterFile(null);
    } catch (err) {
      console.error('Error saving event:', err);
      const raw = String(err?.message || '').trim();
      const code = String(err?.code || '').trim();

      if (raw.includes('Failed to fetch')) {
        setError('Could not reach the backend service. Check that backend-flask is running and try again.');
      } else if (code === 'permission-denied') {
        setError('Permission denied while saving event. Please check your Firebase Firestore and Storage rules.');
      } else if (code === 'unauthenticated') {
        setError('Your session expired. Please sign in again and retry.');
      } else {
        setError(raw || 'Something went wrong while saving your event. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 p-md-5 contact-card section-animate" style={{ borderRadius: '20px' }}>
      <h5 className="mb-1">Add a new event</h5>
      <p className="mb-4" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
        Only approved organizers can create events. Scanner setup can be done later.
      </p>
      {!user && (
        <Alert variant="warning" className="mb-3">
          Please sign in before registering as an organizer or adding an event.
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="mb-3">
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {!organizerLoading && user && organizerStatus !== 'approved' && (
        <Form onSubmit={handleOrganizerRegistration} className="mb-4">
          <Alert variant="secondary" className="mb-3">
            {organizerStatus === 'pending'
              ? 'Your organizer registration is pending approval. Update details below if needed and resubmit.'
              : 'Register as an event organizer first. After approval, you can create events.'}
          </Alert>
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group controlId="organizerName">
                <Form.Label>Organization / brand name</Form.Label>
                <Form.Control
                  type="text"
                  value={organizerForm.organizationName}
                  onChange={(e) =>
                    setOrganizerForm((prev) => ({ ...prev, organizationName: e.target.value }))
                  }
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="organizerEmail">
                <Form.Label>Organizer email</Form.Label>
                <Form.Control
                  type="email"
                  value={organizerForm.organizerEmail}
                  onChange={(e) =>
                    setOrganizerForm((prev) => ({ ...prev, organizerEmail: e.target.value }))
                  }
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="organizerPhone">
                <Form.Label>Organizer phone</Form.Label>
                <Form.Control
                  type="text"
                  value={organizerForm.phone}
                  onChange={(e) =>
                    setOrganizerForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+263..."
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="organizerAddress">
                <Form.Label>Organizer address</Form.Label>
                <Form.Control
                  type="text"
                  value={organizerForm.address}
                  onChange={(e) =>
                    setOrganizerForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="City, suburb, or office location"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-grid">
            <Button
              type="submit"
              variant="outline-light"
              disabled={registeringOrganizer}
            >
              {registeringOrganizer
                ? 'Submitting organizer registration...'
                : 'Submit organizer registration'}
            </Button>
          </div>
        </Form>
      )}

      {organizerLoading && user && (
        <Alert variant="secondary" className="mb-3">
          Checking organizer approval status...
        </Alert>
      )}

      {organizerStatus === 'approved' && (
      <Form onSubmit={handleSubmit}>
        <Row className="mb-3 g-3">
          <Col md={8}>
            <Form.Group controlId="eventTitle">
              <Form.Label>Event title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Eg. Summer Vibes Festival"
                required
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="ticketPrice">
              <Form.Label>Ticket price (USD)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.5"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleChange}
                placeholder="10"
                required={!formData.isFree}
                disabled={formData.isFree}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="eventCategory">
              <Form.Label>Event category</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {eventCategories.map((cat) => (
                  <option key={cat.id} value={cat.tag}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3 g-3">
          <Col md={6}>
            <Form.Group controlId="eventDate">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="eventTime">
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group controlId="venue" className="mb-3">
          <Form.Label>Venue</Form.Label>
          <Form.Control
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            placeholder="Eg. HICC, Harare"
            required
          />
        </Form.Group>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="artist">
              <Form.Label>Headline artist / host (optional)</Form.Label>
              <Form.Control
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                placeholder="Eg. City Lights Band, Youth Conference Team"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="imageUrl">
              <Form.Label>Poster image URL (optional)</Form.Label>
              <Form.Control
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Link to your event poster image"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="posterFile">
              <Form.Label>Or upload poster image (optional)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handlePosterFileChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group controlId="lineup" className="mb-3">
          <Form.Label>Lineup / highlights (optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="lineup"
            value={formData.lineup}
            onChange={handleChange}
            placeholder="Eg. DJ Tinashe, guest speakers, worship team, activities..."
          />
        </Form.Group>

        <Form.Group controlId="description" className="mb-0">
          <Form.Label>Event details</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Short description, dress code, age limit, payment options, etc."
          />
        </Form.Group>

        <hr className="my-4" />
        <h6 className="mb-3">Ticket types and availability</h6>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Check
              type="radio"
              id="pricing-paid"
              name="pricingType"
              label="Paid event (guests pay for tickets)"
              checked={!formData.isFree}
              onChange={() =>
                setFormData((prev) => ({
                  ...prev,
                  isFree: false,
                }))
              }
            />
          </Col>
          <Col md={6}>
            <Form.Check
              type="radio"
              id="pricing-free"
              name="pricingType"
              label="Free event (guests RSVP only)"
              checked={formData.isFree}
              onChange={() =>
                setFormData((prev) => ({
                  ...prev,
                  isFree: true,
                }))
              }
            />
          </Col>
        </Row>
        {formData.isFree ? (
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group controlId="freeTicketQty">
                <Form.Label>Free tickets available</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  name="freeTicketQuantity"
                  value={formData.freeTicketQuantity}
                  onChange={handleChange}
                  placeholder="100"
                    required={formData.isFree}
                />
              </Form.Group>
            </Col>
          </Row>
        ) : (
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group controlId="ticketBasicPrice" className="mb-2">
                <Form.Label>Basic price (USD)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.tickets.basic.price}
                  onChange={(e) => handleTicketChange('basic', 'price', e.target.value)}
                  placeholder="5"
                />
              </Form.Group>
              <Form.Group controlId="ticketBasicQty">
                <Form.Label>Basic tickets available</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  value={formData.tickets.basic.quantity}
                  onChange={(e) => handleTicketChange('basic', 'quantity', e.target.value)}
                  placeholder="100"
                    required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="ticketVipPrice" className="mb-2">
                <Form.Label>VIP price (USD)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.tickets.vip.price}
                  onChange={(e) => handleTicketChange('vip', 'price', e.target.value)}
                  placeholder="20"
                />
              </Form.Group>
              <Form.Group controlId="ticketVipQty">
                <Form.Label>VIP tickets available</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  value={formData.tickets.vip.quantity}
                  onChange={(e) => handleTicketChange('vip', 'quantity', e.target.value)}
                  placeholder="50"
                    required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="ticketVvipPrice" className="mb-2">
                <Form.Label>VVIP price (USD)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.tickets.vvip.price}
                  onChange={(e) => handleTicketChange('vvip', 'price', e.target.value)}
                  placeholder="50"
                />
              </Form.Group>
              <Form.Group controlId="ticketVvipQty">
                <Form.Label>VVIP tickets available</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="1"
                  value={formData.tickets.vvip.quantity}
                  onChange={(e) => handleTicketChange('vvip', 'quantity', e.target.value)}
                  placeholder="20"
                    required
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        <div className="d-grid">
          <Button type="submit" variant="danger" className="gradient-btn" disabled={uploading}>
            {uploading ? 'Saving event…' : 'Save event details'}
          </Button>
        </div>
      </Form>
      )}
    </div>
  );
};

export default HostEventForm;

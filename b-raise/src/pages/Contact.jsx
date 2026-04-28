import { useState, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { API_ENDPOINTS } from '../config/api';

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSubmitted(false);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    try {
      const response = await fetch(API_ENDPOINTS.CONTACT_SUBMIT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send message. Please try again.');
        return;
      }

      setSubmitted(true);
      setError('');
      if (formRef.current) {
        formRef.current.reset();
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Contact form error:', err);
      setError('Failed to send message. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page contact-vibe py-5" style={{ minHeight: '100vh' }}>
      <div className="contact-vibe__aurora" aria-hidden="true" />
      <Container className="contact-shell">
        <Row className="justify-content-center text-center mb-4 mb-lg-5">
          <Col lg={9}>
            <span className="contact-pill mb-3">
              <span className="contact-status-dot" />
              Fast support for hosts, teams, and venues
            </span>
            <h1 className="contact-title">Contact B-HOST</h1>
            <p className="contact-subtitle mb-0">
              Big event or small launch, we help you move from planning to sellout with reliable support.
            </p>
          </Col>
        </Row>

        <Row className="g-4 align-items-stretch">
          <Col lg={5}>
            <div className="contact-panel contact-panel--info h-100 p-4 p-md-5">
              <h5 className="mb-3">Reach us instantly</h5>

              <a className="contact-method" href="tel:+263781192841">
                <span className="contact-method__icon">📞</span>
                <span>
                  <small>Phone (Econet)</small>
                  078 119 2841
                </span>
              </a>

              <a className="contact-method" href="tel:+263715316377">
                <span className="contact-method__icon">📱</span>
                <span>
                  <small>Phone (NetOne)</small>
                  071 531 6377
                </span>
              </a>

              <a className="contact-method" href="mailto:munengebee@gmail.com">
                <span className="contact-method__icon">✉️</span>
                <span>
                  <small>Email</small>
                  munengebee@gmail.com
                </span>
              </a>

              <a
                href="https://wa.me/263781192841"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success w-100 mt-2"
              >
                <i className="bi bi-whatsapp me-2"></i>
                Chat on WhatsApp
              </a>

              <div className="contact-quick-grid mt-4">
                <div className="contact-quick-item">
                  <strong>08:00 - 18:00</strong>
                  <span>Business hours</span>
                </div>
                <div className="contact-quick-item">
                  <strong>~5 min</strong>
                  <span>Average first reply</span>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={7}>
            <div className="contact-panel contact-form-panel h-100 p-4 p-md-5">
              <div className="contact-form-header mb-4">
                <h5 className="mb-0">Send us a message</h5>
                <span className="contact-pill">
                  <span className="contact-status-dot" />
                  Direct email route
                </span>
              </div>

              {submitted && (
                <Alert variant="success" className="mb-3" dismissible onClose={() => setSubmitted(false)}>
                  <strong>Message sent!</strong> Thank you for reaching out. We'll get back to you soon.
                </Alert>
              )}

              {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} ref={formRef}>
                <Form.Group className="mb-3" controlId="contactName">
                  <Form.Label className="contact-field-label">Name</Form.Label>
                  <Form.Control
                    className="contact-field"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="contactEmail">
                  <Form.Label className="contact-field-label">Email</Form.Label>
                  <Form.Control
                    className="contact-field"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="contactMessage">
                  <Form.Label className="contact-field-label">Message</Form.Label>
                  <Form.Control
                    className="contact-field"
                    as="textarea"
                    name="message"
                    rows={5}
                    placeholder="Tell us about your event or question"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Button
                  variant="danger"
                  type="submit"
                  className="gradient-btn contact-submit w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    'Send message'
                  )}
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Contact;

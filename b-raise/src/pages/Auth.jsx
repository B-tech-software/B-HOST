import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const AuthPage = () => {
  const { user, loading, login, signup, logout, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const stateFrom = location.state?.from;
  const savedFrom = sessionStorage.getItem('postAuthRedirect');
  const from =
    typeof stateFrom === 'string' && stateFrom.startsWith('/') && stateFrom !== '/auth'
      ? stateFrom
      : typeof savedFrom === 'string' && savedFrom.startsWith('/') && savedFrom !== '/auth'
      ? savedFrom
      : '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      sessionStorage.removeItem('postAuthRedirect');
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.message ||
          'Sign in is not fully enabled yet. Please try again later.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    if (!loginWithGoogle) return;
    try {
      setSubmitting(true);
      sessionStorage.setItem('postAuthRedirect', from);
      await loginWithGoogle();
      // Do not navigate here; navigation will be handled after redirect
    } catch (err) {
      setError(
        err.message || 'Google sign-in failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore for now
    }
  };

  // Wait for loading before rendering anything
  useEffect(() => {
    if (!loading && user && location.pathname === '/auth') {
      sessionStorage.removeItem('postAuthRedirect');
      navigate(from, { replace: true });
    }
  }, [user, loading, location.pathname, from, navigate]);

  if (loading) {
    return null; // or a spinner if you want
  }
  if (user && location.pathname === '/auth') {
    // Don't render anything while redirecting
    return null;
  }
  if (user) {
    return (
      <div className="contact-page py-5" style={{ minHeight: '100vh' }}>
        <Container>
          <Row className="justify-content-center mb-4 text-center section-animate">
            <Col lg={8}>
              <h1 className="mb-2 contact-hero-title">My account</h1>
              <p className="mb-0 contact-hero-subtitle" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                You are logged in as <strong>{user.email}</strong>.
              </p>
            </Col>
          </Row>
          <Row className="justify-content-center section-animate">
            <Col md={6}>
              <div className="p-4 contact-card text-center">
                <p className="mb-3" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                  You can now buy tickets and view your orders securely.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <Button
                    variant="outline-light"
                    onClick={() => navigate('/orders')}
                  >
                    View my tickets
                  </Button>
                  <Button
                    variant="danger"
                    className="gradient-btn"
                    onClick={handleLogout}
                  >
                    Log out
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="contact-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center mb-4 text-center section-animate">
          <Col lg={8}>
            <span className="contact-badge mb-2">
              <span className="contact-status-dot" />
              <span className="contact-status-label">Secure sign in</span>
            </span>
            <h1 className="mb-2 contact-hero-title">Sign in to B-host</h1>
            <p className="mb-0 contact-hero-subtitle" style={{ fontSize: '0.95rem', opacity: 0.9 }}>
              Log in or create an account to buy tickets and keep your orders in one place.
            </p>
          </Col>
        </Row>
        <Row className="justify-content-center section-animate-delayed">
          <Col md={6}>
            <div className="p-4 contact-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{mode === 'login' ? 'Log in' : 'Create account'}</h5>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                  }}
                >
                  {mode === 'login' ? 'Need an account?' : 'Have an account?'}
                </Button>
              </div>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
              {loginWithGoogle && (
                <>
                  <Button
                    type="button"
                    variant="outline-light"
                    className="w-100 mb-3 auth-google-btn"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                  >
                    <span className="auth-google-icon">
                      <span className="auth-google-icon-letter">G</span>
                    </span>
                    <span>Continue with Google</span>
                  </Button>
                  <div className="text-center mb-3" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    <span>or continue with email</span>
                  </div>
                </>
              )}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="authEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="authPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </Form.Group>
                {mode === 'signup' && (
                  <Form.Group className="mb-3" controlId="authConfirmPassword">
                    <Form.Label>Confirm password</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Form.Group>
                )}
                <Button
                  type="submit"
                  variant="danger"
                  className="gradient-btn w-100"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Log in'
                    : 'Create account'}
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AuthPage;

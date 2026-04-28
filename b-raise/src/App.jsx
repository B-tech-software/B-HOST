import './App.css';
import CustomNavbar from './components/Navbar';
import Homepage from './pages/Homepage';
import Contact from './pages/Contact';
import HostEvent from './pages/HostEvent';
import About from './pages/About';
import Services from './pages/Services';
import Orders from './pages/Orders';
import CartPage from './pages/Cart.jsx';
import EventTickets from './pages/EventTickets.jsx';
import Events from './pages/Events.jsx';
import Terms from './pages/Terms.jsx';
import AuthPage from './pages/Auth.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { isOwnerEmail } from './utils/owner.js';
import { API_ENDPOINTS } from './config/api.js';

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/useAuth.js';
import { useEffect, useMemo, useState } from 'react';

const LaunchIntro = ({ progress, exiting }) => {
  const particles = useMemo(
    () => [
      { id: 'p1', x: '8%', delay: '0s', duration: '4.8s', size: '44px', blur: '0px' },
      { id: 'p2', x: '18%', delay: '0.3s', duration: '5.6s', size: '28px', blur: '1px' },
      { id: 'p3', x: '30%', delay: '0.15s', duration: '4.2s', size: '22px', blur: '0px' },
      { id: 'p4', x: '43%', delay: '0.6s', duration: '5.1s', size: '36px', blur: '0.5px' },
      { id: 'p5', x: '58%', delay: '0.1s', duration: '4.5s', size: '30px', blur: '0px' },
      { id: 'p6', x: '70%', delay: '0.5s', duration: '5.9s', size: '26px', blur: '1px' },
      { id: 'p7', x: '82%', delay: '0.2s', duration: '4.7s', size: '34px', blur: '0px' },
      { id: 'p8', x: '92%', delay: '0.75s', duration: '5.4s', size: '24px', blur: '1.2px' },
    ],
    []
  );

  return (
    <div
      className={`launch-intro ${exiting ? 'launch-intro--exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading B-host"
    >
      <div className="launch-intro__bg" />
      <div className="launch-intro__grid" />
      <div className="launch-intro__glow launch-intro__glow--one" />
      <div className="launch-intro__glow launch-intro__glow--two" />

      <div className="launch-intro__content">
        <p className="launch-intro__kicker">Loading your experience</p>
        <h1 className="launch-intro__brand">B-HOST</h1>
        <p className="launch-intro__subtitle">Setting everything in motion</p>
        <div className="launch-intro__meter" aria-hidden="true">
          <span className="launch-intro__meter-fill" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="launch-intro__progress">{Math.round(progress)}%</p>
      </div>

      <div className="launch-intro__stream" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="launch-intro__particle"
            style={{
              left: particle.x,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              width: particle.size,
              height: particle.size,
              filter: `blur(${particle.blur})`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return children;
};

const RequireOwner = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!isOwnerEmail(user.email)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RequireApprovedOrganizer = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const checkOrganizer = async () => {
      if (!user?.uid) {
        console.debug('[RequireApprovedOrganizer] No uid, not approved');
        setChecking(false);
        setIsApproved(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_ENDPOINTS.ORGANIZER_STATUS}?uid=${encodeURIComponent(user.uid)}`
        );
        const payload = await response.json();
        console.debug('[RequireApprovedOrganizer] API response:', payload);

        // Check if status is approved (case-insensitive, trim whitespace)
        const status = String(payload?.status || '').trim().toLowerCase();
        const approved = status === 'approved';
        
        console.debug('[RequireApprovedOrganizer] Status:', status, 'Approved:', approved);
        setIsApproved(approved);
      } catch (err) {
        console.error('[RequireApprovedOrganizer] API call failed:', err);
        setIsApproved(false);
      } finally {
        setChecking(false);
      }
    };

    checkOrganizer();
  }, [user?.uid]);

  if (loading || checking) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!isApproved) {
    console.debug('[RequireApprovedOrganizer] User not approved, redirecting to /host');
    return <Navigate to="/host" replace />;
  }

  return children;
};


function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(!navigator.onLine);
  const [launchPhase, setLaunchPhase] = useState('loading');
  const [introProgress, setIntroProgress] = useState(8);

  useEffect(() => {
    let cancelled = false;
    const timers = [];
    let progressTimer;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minDurationMs = prefersReducedMotion ? 450 : 1700;
    const startTime = performance.now();

    const schedule = (fn, ms) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    const clearProgressTimer = () => {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
    };

    const waitForWindowLoad = () => {
      if (document.readyState === 'complete') {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        window.addEventListener('load', resolve, { once: true });
      });
    };

    const waitForFonts = () => {
      if (!document.fonts || !document.fonts.ready) {
        return Promise.resolve();
      }
      return document.fonts.ready.catch(() => undefined);
    };

    const waitForInitialImages = () => {
      const pendingImages = Array.from(document.images || []).filter((img) => !img.complete);
      if (!pendingImages.length) {
        return Promise.resolve();
      }

      return Promise.all(
        pendingImages.map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
        )
      );
    };

    const finishLaunch = () => {
      clearProgressTimer();

      const elapsed = performance.now() - startTime;
      const waitRemaining = Math.max(0, minDurationMs - elapsed);

      schedule(() => {
        setIntroProgress(100);
        setLaunchPhase('exiting');
        schedule(() => {
          setLaunchPhase('done');
        }, prefersReducedMotion ? 0 : 420);
      }, waitRemaining);
    };

    progressTimer = window.setInterval(() => {
      if (cancelled) return;
      setIntroProgress((previous) => {
        if (previous >= 92) return previous;
        return Math.min(92, previous + Math.max(0.5, (92 - previous) * 0.08));
      });
    }, 90);

    Promise.all([waitForWindowLoad(), waitForFonts(), waitForInitialImages()])
      .then(() => {
        if (!cancelled) {
          finishLaunch();
        }
      })
      .catch(() => {
        if (!cancelled) {
          finishLaunch();
        }
      });

    return () => {
      cancelled = true;
      clearProgressTimer();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (launchPhase !== 'done') {
    return <LaunchIntro progress={introProgress} exiting={launchPhase === 'exiting'} />;
  }

  return (
    <Router>
      <ScrollToTop />
      <CustomNavbar />
      {!isOnline && showOfflineToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            zIndex: 2100,
            maxWidth: '340px',
            width: 'calc(100% - 2rem)',
            background: 'rgba(24, 24, 24, 0.96)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderLeft: '4px solid #ff003c',
            borderRadius: '12px',
            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(6px)',
            padding: '0.85rem 0.95rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>You are offline</div>
              <div style={{ opacity: 0.9, fontSize: '0.84rem' }}>Some features may not work until connection is restored.</div>
            </div>
            <button
              type="button"
              onClick={() => setShowOfflineToast(false)}
              aria-label="Dismiss offline notice"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#fff',
                fontSize: '1.1rem',
                lineHeight: 1,
                cursor: 'pointer',
                opacity: 0.85,
              }}
            >
              x
            </button>
          </div>
        </div>
      )}
      <div>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/host" element={<HostEvent />} />
          <Route
            path="/organizer-dashboard"
            element={(
              <RequireApprovedOrganizer>
                <OrganizerDashboard />
              </RequireApprovedOrganizer>
            )}
          />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route
            path="/orders"
            element={(
              <RequireAuth>
                <Orders />
              </RequireAuth>
            )}
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/events/:eventId/tickets" element={<EventTickets />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/terms" element={<Terms />} />
          <Route
            path="/admin"
            element={(
              <RequireOwner>
                <AdminDashboard />
              </RequireOwner>
            )}
          />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;

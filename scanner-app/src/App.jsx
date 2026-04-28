import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import SyncStatus from './components/SyncStatus.jsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scannerSession, setScannerSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeScannerSession = (rawSession) => {
    if (!rawSession || typeof rawSession !== 'object') return null;

    const scannerToken = rawSession.scannerToken || rawSession.token || '';
    const eventId = rawSession.eventId || rawSession.eventID || rawSession.event_id || '';
    const id = rawSession.id || rawSession.sessionId || rawSession.codeId || '';

    if (!scannerToken || !eventId) {
      return null;
    }

    return {
      ...rawSession,
      scannerToken,
      eventId,
      id,
    };
  };

  useEffect(() => {
    // Check if scanner is already logged in
    const session = localStorage.getItem('scannerSession');
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        const normalized = normalizeScannerSession(parsedSession);
        if (normalized) {
          setScannerSession(normalized);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('scannerSession');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('scannerSession');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (session) => {
    const normalized = normalizeScannerSession(session);
    if (!normalized) {
      return;
    }
    setScannerSession(normalized);
    setIsLoggedIn(true);
    localStorage.setItem('scannerSession', JSON.stringify(normalized));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setScannerSession(null);
    localStorage.removeItem('scannerSession');
    localStorage.removeItem('ticketCache');
    localStorage.removeItem('syncQueue');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--dark)',
        color: '#fff',
        fontSize: '18px',
      }}>
        Loading scanner app...
      </div>
    );
  }

  return (
    <Router>
      <SyncStatus />
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <ScannerPage session={scannerSession} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

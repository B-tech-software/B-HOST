
import { NavLink, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/useAuth.js';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { isOwnerEmail } from '../utils/owner.js';

const CustomNavbar = () => {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [organizerStatus, setOrganizerStatus] = useState(null);
  const isOwner = isOwnerEmail(user?.email);
  const isApprovedOrganizer = organizerStatus === 'approved';

  useEffect(() => {
    const loadOrganizerStatus = async () => {
      if (!user?.uid) {
        setOrganizerStatus(null);
        return;
      }

      try {
        const response = await fetch(
          `${API_ENDPOINTS.ORGANIZER_STATUS}?uid=${encodeURIComponent(user.uid)}`
        );
        const data = await response.json();
        setOrganizerStatus(data?.status || null);
      } catch (err) {
        console.error('Failed to load organizer status for navbar:', err);
        setOrganizerStatus(null);
      }
    };

    loadOrganizerStatus();
  }, [user]);

  // Get first letter of email for avatar
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : '';

  return (
  <nav className="navbar navbar-expand-lg navbar-dark navbar-gradient shadow-sm sticky-top main-navbar">
    <div className="container">
      {/* Mobile header: brand on left, profile + hamburger on right */}
      <div className="d-flex align-items-center justify-content-between w-100 d-lg-none">
        <a className="navbar-brand fw-bold mb-0" href="/" style={{ fontSize: 24, letterSpacing: 1 }}>
          <span className="footer-logo-text">B-host</span>
        </a>
        <div className="d-flex align-items-center">
          {user ? (
            <div className="ms-3 position-relative">
              <div
                className="profile-avatar bg-danger text-white fw-bold d-flex align-items-center justify-content-center"
                style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
                onClick={() => setShowDropdown((v) => !v)}
                title={user.email}
              >
                {userInitial}
              </div>
              {showDropdown && (
                <div
                  className="position-absolute bg-white shadow rounded-3 mt-2"
                  style={{
                    right: 0,
                    minWidth: 250,
                    zIndex: 100,
                    border: '1px solid #f1f1f1',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
                    padding: '0.85rem 0.7rem',
                  }}
                >
                  <div
                    className="small px-2 mb-2"
                    style={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      background: 'linear-gradient(180deg, #fff8fa 0%, #fff 100%)',
                      borderRadius: 10,
                      padding: '0.6rem 0.8rem',
                      color: '#333',
                      letterSpacing: 0.2,
                      border: '1px solid #ffe8ef',
                    }}
                  >
                    {user.email}
                  </div>
                  <hr style={{ margin: '0.55rem 0 0.8rem 0', borderColor: '#ff003c', borderWidth: 2, opacity: 0.85 }} />
                  {isOwner && (
                    <Link to="/admin" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                      Owner Dashboard
                    </Link>
                  )}
                  {isApprovedOrganizer && (
                    <Link to="/organizer-dashboard" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                      Organizer Dashboard
                    </Link>
                  )}
                  <Link to="/orders" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                    My Orders
                  </Link>
                  <button
                    className="dropdown-item px-3 py-2 text-danger"
                    style={{ borderRadius: 9, fontWeight: 700, fontSize: '0.96rem', background: '#fff3f3', border: '1px solid #ffd8d8', marginTop: 8 }}
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <button className="navbar-toggler ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#main-navbar-nav" aria-controls="main-navbar-nav" aria-expanded="false" aria-label="Toggle navigation">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9.7 6.6a.9.9 0 0 1 1.3 0l1 1 1-1a.9.9 0 1 1 1.3 1.3l-1.7 1.7a.9.9 0 0 1-1.3 0L9.7 7.9a.9.9 0 0 1 0-1.3Z" />
              <path d="M7.6 10.2a1 1 0 0 1 1.4 0l3 3 3-3a1 1 0 1 1 1.4 1.4l-3.7 3.7a1 1 0 0 1-1.4 0l-3.7-3.7a1 1 0 0 1 0-1.4Z" />
              <path d="M5.4 14a1.1 1.1 0 0 1 1.6 0L12 19l5-5a1.1 1.1 0 0 1 1.6 1.6l-5.8 5.8a1.1 1.1 0 0 1-1.6 0l-5.8-5.8a1.1 1.1 0 0 1 0-1.6Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop brand: standard position on large devices */}
      <a className="navbar-brand fw-bold mb-0 d-none d-lg-block" href="/" style={{ fontSize: 24, letterSpacing: 1 }}>
        <span className="footer-logo-text">B-host</span>
      </a>
      <div className="collapse navbar-collapse justify-content-end mt-2 mt-lg-0" id="main-navbar-nav">
        <ul className="navbar-nav mb-2 mb-lg-0">
          <li className="nav-item">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
              }
            >
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/host"
              className={({ isActive }) =>
                `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
              }
            >
              Host Event
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
              }
            >
              Contact Us
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
              }
            >
              My Orders
            </NavLink>
          </li>
          {isOwner && (
            <li className="nav-item">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
                }
              >
                Dashboard
              </NavLink>
            </li>
          )}
          {isApprovedOrganizer && (
            <li className="nav-item">
              <NavLink
                to="/organizer-dashboard"
                className={({ isActive }) =>
                  `nav-link main-nav-link${isActive ? ' main-nav-link-active' : ''}`
                }
              >
                Organizer Dashboard
              </NavLink>
            </li>
          )}
          <li className="nav-item d-lg-none mt-2">
            <div className="d-flex flex-wrap gap-2">
              {isApprovedOrganizer && (
                <Link className="btn btn-outline-light btn-sm" to="/host">Add Event</Link>
              )}
              <Link className="btn btn-danger gradient-btn btn-sm" to="/events">Buy Tickets</Link>
              <NavLink
                to="/cart"
                className="btn btn-outline-light btn-sm position-relative"
                aria-label="Ticket cart"
              >
                <i className="bi bi-cart3"></i>
                {cartCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {cartCount}
                  </span>
                )}
              </NavLink>
            </div>
          </li>
          <li className="nav-item d-flex align-items-center d-none d-lg-flex">
            {isApprovedOrganizer && (
              <Link className="btn btn-outline-light ms-2" to="/host">Add Event</Link>
            )}
            <Link className="btn btn-danger gradient-btn ms-2" to="/events">Buy Tickets</Link>
            <NavLink
              to="/cart"
              className="btn btn-outline-light ms-2 position-relative"
              aria-label="Ticket cart"
            >
              <i className="bi bi-cart3"></i>
              {cartCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.65rem' }}
                >
                  {cartCount}
                </span>
              )}
            </NavLink>
            {user ? (
              <div className="ms-3 position-relative">
                <div
                  className="profile-avatar bg-danger text-white fw-bold d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
                  onClick={() => setShowDropdown((v) => !v)}
                  title={user.email}
                >
                  {userInitial}
                </div>
                {showDropdown && (
                  <div
                    className="position-absolute bg-white shadow rounded-3 mt-2"
                    style={{
                      right: 0,
                      minWidth: 250,
                      zIndex: 100,
                      border: '1px solid #f1f1f1',
                      boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
                      padding: '0.85rem 0.7rem',
                    }}
                  >
                    <div
                      className="small px-2 mb-2"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.98rem',
                        background: 'linear-gradient(180deg, #fff8fa 0%, #fff 100%)',
                        borderRadius: 10,
                        padding: '0.6rem 0.8rem',
                        color: '#333',
                        letterSpacing: 0.2,
                        border: '1px solid #ffe8ef',
                      }}
                    >
                      {user.email}
                    </div>
                    <hr style={{ margin: '0.55rem 0 0.8rem 0', borderColor: '#ff003c', borderWidth: 2, opacity: 0.85 }} />
                    {isOwner && (
                      <Link to="/admin" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                        Owner Dashboard
                      </Link>
                    )}
                    {isApprovedOrganizer && (
                      <Link to="/organizer-dashboard" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                        Organizer Dashboard
                      </Link>
                    )}
                    <Link to="/orders" className="dropdown-item px-3 py-2" style={{ borderRadius: 9, fontWeight: 600, fontSize: '0.96rem' }}>
                      My Orders
                    </Link>
                    <button
                      className="dropdown-item px-3 py-2 text-danger"
                      style={{ borderRadius: 9, fontWeight: 700, fontSize: '0.96rem', background: '#fff3f3', border: '1px solid #ffd8d8', marginTop: 8 }}
                      onClick={logout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </li>
        </ul>
      </div>
    </div>
  </nav>
  );
};

export default CustomNavbar;


import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="footer-gradient text-white py-4 mt-auto main-footer" style={{ background: '#181818', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -4px 32px rgba(255,0,60,0.15)' }}>
    <div className="container text-center">
      <div className="footer-iphone">
        <div className="footer-logo-animation">
          <span className="footer-logo-text">B-host</span>
          <span className="footer-logo-glow"></span>
        </div>
        <nav className="footer-nav mt-3 mb-2">
          <Link to="/" className="footer-link footer-link-tag">Home</Link>
          <Link to="/host" className="footer-link footer-link-tag">Host Event</Link>
          <Link to="/contact" className="footer-link footer-link-tag">Contact Us</Link>
          <Link to="/terms" className="footer-link footer-link-tag">Terms &amp; Conditions</Link>
          <Link to="/about" className="footer-link footer-link-tag">About</Link>
          <Link to="/services" className="footer-link footer-link-tag">Services</Link>
        </nav>
        <hr
          className="footer-divider"
          style={{
            borderTop: '1px solid #ffffff',
            opacity: 0.8,
            margin: '1.5rem auto 1.25rem auto',
            maxWidth: '420px'
          }}
        />
      </div>
      <div className="footer-bottom text-center mt-2" style={{ fontSize: '0.95rem', opacity: 0.7 }}>
        &copy; {new Date().getFullYear()} B-host &mdash; Crafted with care by the B-host team. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;

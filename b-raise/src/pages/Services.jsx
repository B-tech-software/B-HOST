import React from 'react';

const Services = () => {
  return (
    <div className="container py-5" style={{ minHeight: '70vh' }}>
      <h1 className="mb-4 fw-bold" style={{ color: '#ff003c' }}>Our Services</h1>
      <p className="mb-4" style={{ maxWidth: '720px' }}>
        At B-host, we provide tools and support to help you plan, host,
        and manage memorable events with ease. Whether you&apos;re organizing
        a small gathering or a large conference, we&apos;ve got you covered.
      </p>
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title fw-semibold">Event Hosting</h5>
              <p className="card-text">
                Create and publish events, manage registrations, and keep
                track of attendees from a single intuitive dashboard.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title fw-semibold">Promotion &amp; Discovery</h5>
              <p className="card-text">
                Reach the right audience with smart discovery features that
                put your events in front of people who care.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title fw-semibold">On-site Support</h5>
              <p className="card-text">
                Seamless check-ins, real-time updates, and tools to ensure
                your event runs smoothly from start to finish.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;

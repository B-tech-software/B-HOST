import { Container, Row, Col } from 'react-bootstrap';

const About = () => {
  return (
    <div className="contact-page about-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        {/* Hero / intro section */}
        <Row className="justify-content-center mb-5 text-center section-animate">
          <Col lg={8}>
            <span className="about-hero-tag">Get to know B-host</span>
            <h1 className="mb-3 contact-hero-title">About B-host</h1>
            <p className="mb-3 contact-hero-subtitle" style={{ fontSize: '1rem' }}>
              B-host is a modern events platform built to make planning, hosting,
              and attending events feel effortless. From intimate worship nights
              and creative meetups to large business conferences and marathons,
              we give organizers the tools they need to show up like pros.
            </p>
            <div className="about-hero-metrics">
              <div className="about-metric-chip">
                <span className="about-metric-number">24/7</span>
                <span className="about-metric-label">Always-on platform</span>
              </div>
              <div className="about-metric-chip">
                <span className="about-metric-number">Local</span>
                <span className="about-metric-label">Built for Zim &amp; region</span>
              </div>
              <div className="about-metric-chip">
                <span className="about-metric-number">Future</span>
                <span className="about-metric-label">Designed to scale</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Big story card */}
        <Row className="justify-content-center mb-5 section-animate-delayed">
          <Col lg={10}>
            <div className="p-5 contact-card about-story-card" style={{ borderRadius: '24px' }}>
              <div className="about-badge text-uppercase mb-3">
                <span className="about-badge-dot"></span>
                Our story
              </div>
              <h4 className="mb-3 about-section-title">Why we started B-host</h4>
              <p style={{ fontSize: '0.98rem' }}>
                In Southern Africa, many amazing events never reach the people who
                would love them. Information is scattered across posters, group chats,
                and last-minute forwards. Hosts work hard, but the tools they use
                often feel outdated, unreliable, or too complicated.
              </p>
              <p style={{ fontSize: '0.98rem' }}>
                B-host was created to change that. We&apos;re building a single, trusted
                home for events &mdash; a place where hosting looks professional,
                buying a ticket feels safe, and discovering what&apos;s happening around
                you is exciting instead of stressful.
              </p>
              <p style={{ fontSize: '0.98rem' }}>
                We start from Zimbabwe, but our vision is regional. We want churches,
                communities, creatives, and brands across Africa to have access to
                world-class event tools that still feel local, warm, and familiar.
              </p>
            </div>
          </Col>
        </Row>

        {/* What we do / platform overview */}
        <Row className="g-4 mb-5 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <div className="about-icon-circle mb-3">
                <i className="bi bi-stars"></i>
              </div>
              <h5 className="mb-3">What we do</h5>
              <p style={{ fontSize: '0.95rem' }}>
                B-host helps event organizers create beautiful event pages, manage
                ticketing and registrations, and communicate clearly with guests.
                We focus on mobile-first experiences, so that everything works
                smoothly on the devices people already use every day.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Under the hood, we care about reliability and trust: from how
                information is presented, to how payments are processed, to how
                guests are reminded and checked in on the event day.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <div className="about-icon-circle mb-3">
                <i className="bi bi-heart-pulse"></i>
              </div>
              <h5 className="mb-3">Why it matters</h5>
              <p style={{ fontSize: '0.95rem' }}>
                Great events change cities, churches, and communities &mdash; but
                only if people can find them and trust them. When your event looks
                organized and professional, people are more likely to show up,
                invite friends, and come back next time.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                By giving hosts a clean, recognizable platform, we help build that
                trust. Our goal is for guests to see a B-host event and immediately
                feel: &quot;This is legit, this is worth my time.&quot;
              </p>
            </div>
          </Col>
        </Row>

        {/* Mission / Vision / Who we serve big tiles */}
        <Row className="g-4 mb-5 section-animate-delayed">
          <Col md={4}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '230px' }}>
              <div className="about-icon-circle mb-3">
                <i className="bi bi-rocket-takeoff"></i>
              </div>
              <h6 className="mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Our Mission</h6>
              <p style={{ fontSize: '0.95rem' }}>
                To empower hosts with simple, powerful tools so they can focus on
                creating meaningful experiences, not wrestling with complex systems.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                If you can dream the event, B-host should help you bring it to life.
              </p>
            </div>
          </Col>
          <Col md={4}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '230px' }}>
              <div className="about-icon-circle mb-3">
                <i className="bi bi-eye"></i>
              </div>
              <h6 className="mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Our Vision</h6>
              <p style={{ fontSize: '0.95rem' }}>
                A vibrant events ecosystem where anyone can open B-host and instantly
                see what&apos;s happening this week that matches their interests, values,
                and budget.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                We imagine a future where discovering events feels as natural as
                scrolling your favorite social feed.
              </p>
            </div>
          </Col>
          <Col md={4}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '230px' }}>
              <div className="about-icon-circle mb-3">
                <i className="bi bi-people"></i>
              </div>
              <h6 className="mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Who we serve</h6>
              <p style={{ fontSize: '0.95rem' }}>
                Churches, creatives, festivals, businesses, sports organizers,
                student groups, and anyone who wants to bring people together in a
                professional, organized way.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Whether it&apos;s a hundred people or ten thousand, we want you to
                feel supported at every step.
              </p>
            </div>
          </Col>
        </Row>

        {/* How B-host works (vertical steps) */}
        <Row className="justify-content-center mb-4 section-animate-delayed">
          <Col lg={10}>
            <div className="p-5 contact-card about-journey-card" style={{ borderRadius: '24px' }}>
              <div className="about-badge text-uppercase mb-3">
                <span className="about-badge-dot"></span>
                Your journey with us
              </div>
              <h4 className="mb-4 about-section-title">How B-host fits into your event journey</h4>
              <Row className="g-4">
                <Col md={4}>
                  <div className="about-step-header mb-2">
                    <span className="about-step-badge">1</span>
                    <h6 className="mb-0">Plan &amp; set up</h6>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>
                    Create your event, add dates, venue, pricing, and capacity.
                    Customize details so your event page clearly tells people what
                    to expect.
                  </p>
                </Col>
                <Col md={4}>
                  <div className="about-step-header mb-2">
                    <span className="about-step-badge">2</span>
                    <h6 className="mb-0">Share &amp; promote</h6>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>
                    Share your B-host link across WhatsApp, social media, and email.
                    Guests land on a page that looks clean, trustworthy, and easy to
                    act on.
                  </p>
                </Col>
                <Col md={4}>
                  <div className="about-step-header mb-2">
                    <span className="about-step-badge">3</span>
                    <h6 className="mb-0">Host &amp; grow</h6>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>
                    On the day, manage check-ins and guest flow with confidence.
                    Afterward, use insights to make your next event even better.
                  </p>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default About;

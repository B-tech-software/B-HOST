import { Container, Row, Col } from 'react-bootstrap';

const Terms = () => {
  return (
    <div className="contact-page about-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center mb-5 text-center section-animate">
          <Col lg={8}>
            <span className="about-hero-tag">Please read carefully</span>
            <h1 className="mb-3 contact-hero-title">Terms &amp; Conditions</h1>
            <p className="mb-3 contact-hero-subtitle" style={{ fontSize: '1rem' }}>
              These Terms &amp; Conditions (the &quot;Terms&quot;) govern your access to and
              use of the B-host platform in Zimbabwe. By using B-host, you agree
              to these Terms. If you do not agree, please do not use the
              platform.
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              B-host is an event ticket marketplace that connects event
              organizers with people who want to attend their events. B-host
              itself does not create or run the events listed on the platform.
            </p>
          </Col>
        </Row>

        <Row className="justify-content-center mb-4 section-animate-delayed">
          <Col lg={10}>
            <div className="p-4 p-md-5 contact-card about-story-card" style={{ borderRadius: '24px' }}>
              <h4 className="mb-3 about-section-title">1. Definitions</h4>
              <p style={{ fontSize: '0.95rem' }}>
                In these Terms:
              </p>
              <ul style={{ fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
                <li>
                  <strong>&quot;Platform&quot;</strong> means the B-host website,
                  applications, and related services.
                </li>
                <li>
                  <strong>&quot;User&quot; / &quot;you&quot;</strong> means any person or
                  organisation that accesses or uses the Platform.
                </li>
                <li>
                  <strong>&quot;Organizer&quot;</strong> means a User who creates,
                  lists, or manages events on the Platform.
                </li>
                <li>
                  <strong>&quot;Attendee&quot;</strong> means a User who browses,
                  purchases, or registers for tickets to events on the Platform.
                </li>
                <li>
                  <strong>&quot;Event&quot;</strong> means any gathering, show,
                  conference, service, or activity listed on the Platform.
                </li>
              </ul>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <h5 className="mb-3">2. Eligibility &amp; Accounts</h5>
              <p style={{ fontSize: '0.95rem' }}>
                You must be at least 18 years old, or the legal age of majority
                in Zimbabwe, to create an account or purchase tickets on B-host.
                By using the Platform, you confirm that you meet this
                requirement and that you are legally capable of entering into a
                binding agreement.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Where you create an account, you must provide accurate and
                complete information and keep it up to date. You are
                responsible for maintaining the confidentiality of your login
                details and for all activity that occurs under your account.
                Please contact us immediately if you suspect any unauthorised
                access to your account.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <h5 className="mb-3">3. Role of B-host</h5>
              <p style={{ fontSize: '0.95rem' }}>
                B-host is a marketplace and technology platform. Unless
                clearly stated otherwise for a specific event, B-host is not an
                event organizer, venue, or promoter. Tickets are sold by
                Organizers, and when you buy a ticket, your contract is with
                the relevant Organizer, not B-host.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Organizers are solely responsible for their events, including
                event information, delivery of the event, safety, and
                compliance with Zimbabwean laws and any applicable by-laws or
                permits.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '260px' }}>
              <h5 className="mb-3">4. Acceptable Use &amp; Safety</h5>
              <p style={{ fontSize: '0.95rem' }}>
                You agree to use B-host only for lawful purposes and in a way
                that does not harm the Platform, other Users, or the public.
                You must not:
              </p>
              <ul style={{ fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
                <li>Post or share unlawful, misleading, or offensive content.</li>
                <li>Use the Platform to defraud, scam, or mislead others.</li>
                <li>
                  Interfere with the security or proper functioning of the
                  Platform, including by introducing viruses or harmful code.
                </li>
                <li>
                  Attempt to gain unauthorised access to other accounts or to
                  areas of the Platform.
                </li>
              </ul>
              <p style={{ fontSize: '0.95rem' }}>
                At events, Attendees must follow all rules set by the Organizer,
                venue, and local authorities. If you feel unsafe, please seek
                assistance from event security or local emergency services.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '260px' }}>
              <h5 className="mb-3">5. Organizers &amp; Event Listings</h5>
              <p style={{ fontSize: '0.95rem' }}>
                If you are an Organizer, you are responsible for the accuracy of
                your event information (including dates, venue, pricing,
                capacity, age limits, and refund policy) and for obtaining all
                licences, permits, and authorisations required under Zimbabwean
                law.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                You must honour the tickets sold and any stated refund or
                cancellation policy and comply with applicable consumer
                protection, health and safety, and public order requirements.
                B-host may remove or suspend events or accounts that appear to
                be fraudulent, unsafe, or in breach of these Terms or the law.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <h5 className="mb-3">6. Tickets, Payments &amp; Refunds</h5>
              <p style={{ fontSize: '0.95rem' }}>
                Ticket prices, fees, and availability are set by Organizers,
                unless otherwise stated. Before purchasing, please review the
                event details and refund policy shown on the event page.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Payments on B-host may be processed by third-party payment
                providers. By completing a purchase, you authorise B-host and
                its payment partners to charge your selected payment method for
                the full amount, including any applicable fees and taxes.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                If an event is cancelled, rescheduled, or materially changed,
                responsibility for refunds lies primarily with the Organizer,
                subject to their stated policy and applicable Zimbabwean law.
                B-host may, at its discretion, assist in communicating with the
                Organizer but is not obliged to provide refunds on the
                Organizer&apos;s behalf unless explicitly stated.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '260px' }}>
              <h5 className="mb-3">7. Content &amp; Intellectual Property</h5>
              <p style={{ fontSize: '0.95rem' }}>
                You remain the owner of any content you upload or submit to the
                Platform. However, by doing so you grant B-host a
                non-exclusive, royalty-free licence to use, display, and
                distribute that content in connection with operating and
                promoting the Platform.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                You confirm that you have the right to share such content and
                that it does not infringe the rights of any third party. B-host
                may remove content that appears to violate these Terms, the law,
                or the safety or rights of others.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                The B-host name, logo, and platform design are protected by
                intellectual property laws and may not be copied or used
                without our written permission.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '240px' }}>
              <h5 className="mb-3">8. Privacy</h5>
              <p style={{ fontSize: '0.95rem' }}>
                We respect your privacy and handle personal information in
                accordance with our Privacy Policy, which forms part of these
                Terms. By using B-host, you consent to the collection and use of
                your information as described there.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                Organizers who receive Attendee information through the
                Platform must use it only for legitimate event-related purposes
                and in line with applicable data protection and privacy
                requirements in Zimbabwe.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-tile" style={{ borderRadius: '18px', minHeight: '240px' }}>
              <h5 className="mb-3">9. Disclaimers &amp; Limitation of Liability</h5>
              <p style={{ fontSize: '0.95rem' }}>
                The Platform is provided on an &quot;as is&quot; and
                &quot;as available&quot; basis. While we aim to keep B-host
                reliable and secure, we do not guarantee that it will be
                uninterrupted or error-free.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                To the fullest extent permitted under Zimbabwean law, B-host is
                not liable for any loss, damage, injury, or expense arising
                from:
              </p>
              <ul style={{ fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
                <li>the actions or omissions of any Organizer or Attendee;</li>
                <li>the quality, safety, or outcome of any event;</li>
                <li>
                  any interruption, delay, or error in the Platform or payment
                  services; or
                </li>
                <li>
                  any indirect, consequential, or special loss (including loss
                  of profits or opportunity).
                </li>
              </ul>
              <p style={{ fontSize: '0.95rem' }}>
                Where liability cannot be excluded, it will be limited, to the
                extent permitted by law, to the total fees paid to B-host by you
                in the 6 months preceding the incident giving rise to the claim.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4 section-animate-delayed">
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '240px' }}>
              <h5 className="mb-3">10. Indemnity</h5>
              <p style={{ fontSize: '0.95rem' }}>
                You agree to indemnify and hold harmless B-host and its team
                from any claims, losses, damages, and expenses (including
                reasonable legal fees) arising out of or in connection with your
                use of the Platform, your events (if you are an Organizer), your
                breach of these Terms, or your violation of any law or the
                rights of a third party.
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-4 h-100 contact-card about-icon-card" style={{ borderRadius: '20px', minHeight: '240px' }}>
              <h5 className="mb-3">11. Suspension, Changes &amp; Termination</h5>
              <p style={{ fontSize: '0.95rem' }}>
                We may update or change the Platform and these Terms from time
                to time. Where required by law, we will give reasonable notice
                of significant changes. Continued use of B-host after changes
                take effect means you accept the updated Terms.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                We may suspend or terminate your access if we believe you have
                breached these Terms, the law, or put other Users or the
                Platform at risk. You may stop using B-host at any time.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="justify-content-center mb-5 section-animate-delayed">
          <Col lg={10}>
            <div className="p-4 p-md-5 contact-card about-journey-card" style={{ borderRadius: '24px' }}>
              <h4 className="mb-3 about-section-title">12. Governing Law &amp; Contact</h4>
              <p style={{ fontSize: '0.95rem' }}>
                These Terms are governed by the laws of the Republic of
                Zimbabwe. Any disputes arising in connection with these Terms or
                your use of B-host will, subject to applicable law, be subject
                to the non-exclusive jurisdiction of the courts of Zimbabwe.
              </p>
              <p style={{ fontSize: '0.95rem' }}>
                If you have questions or concerns about these Terms, please
                contact the B-host team using the details provided on our
                Contact page.
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                This summary of our Terms &amp; Conditions is intended to give
                clear, practical information about how B-host works. It does not
                replace independent legal advice, and Organizers remain
                responsible for complying with all laws and regulations that
                apply to their events.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Terms;

import { Container, Row, Col } from 'react-bootstrap';
import HostEventForm from '../components/HostEventForm.jsx';

const HostEvent = () => {
  return (
    <div className="contact-page about-page py-5" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center section-animate-delayed">
          <Col lg={8}>
            <HostEventForm />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HostEvent;

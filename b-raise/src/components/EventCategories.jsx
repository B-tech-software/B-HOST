import { Row, Col } from 'react-bootstrap';

export const eventCategories = [
  { id: 1, label: 'Business Conferences', tag: 'Corporate', icon: '💼' },
  { id: 2, label: 'Gospel Shows', tag: 'Concert', icon: '🎤' },
  { id: 3, label: 'Worship Experiences', tag: 'Worship', icon: '🙏' },
  { id: 4, label: 'Tech & Creators', tag: 'Tech', icon: '💻' },
  { id: 5, label: 'Festivals & Parties', tag: 'Festival', icon: '🎉' },
  { id: 6, label: 'Sports & Fitness', tag: 'Fitness', icon: '🏃‍♂️' },
  { id: 7, label: 'Comedy & Entertainment', tag: 'Comedy', icon: '🎭' },
];

const EventCategories = ({ selectedCategory, onSelectCategory }) => {
  const handleClick = (tag) => {
    if (!onSelectCategory) return;
    // Clicking the same category again clears the filter
    onSelectCategory(tag === selectedCategory ? null : tag);
  };

  return (
    <section className="event-categories-section mt-2 mt-lg-3">
      <Row className="mb-2 justify-content-center text-center">
        <Col lg={8}>
          <p className="event-categories-label mb-1">Browse by vibe</p>
          <h2 className="event-categories-title mb-0">Pick an event category</h2>
        </Col>
      </Row>
      <Row className="g-2 g-md-3 justify-content-center">
        {eventCategories.map((cat) => (
          <Col
            key={cat.id}
            xs={6}
            sm={4}
            md={4}
            lg={4}
            className="d-flex justify-content-center"
          >
            <button
              type="button"
              className={`event-category-btn w-100${selectedCategory === cat.tag ? ' event-category-btn--active' : ''}`}
              onClick={() => handleClick(cat.tag)}
              aria-pressed={selectedCategory === cat.tag}
            >
              <span className="event-category-btn-label">{cat.label}</span>
            </button>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default EventCategories;

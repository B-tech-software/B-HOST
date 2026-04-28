import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';


const SearchBar = ({ onSearch, onInputChange, value = '', loading = false }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  // Keep internal state in sync with parent value
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  React.useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  const handleChange = (e) => {
    setInternalValue(e.target.value);
    if (onInputChange) {
      onInputChange(e.target.value);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    if (onSearch) {
      await Promise.resolve(onSearch(internalValue.trim()));
    }
    setIsLoading(false);
  };

  return (
    <Form onSubmit={handleSubmit} className="homepage-search-form">
      <InputGroup size="lg">
        <Form.Control
          type="text"
          placeholder="Search events, artists, venues..."
          aria-label="Search events, artists, venues"
          value={internalValue}
          onChange={handleChange}
          autoComplete="off"
        />
        <Button type="submit" variant="danger" className="gradient-btn" disabled={isLoading}>
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ verticalAlign: 'middle' }}></span>
          ) : (
            'Search'
          )}
        </Button>
      </InputGroup>
    </Form>
  );
};

export default SearchBar;

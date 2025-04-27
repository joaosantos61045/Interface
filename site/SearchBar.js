import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';

const SearchBar = ({ nodes }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { setCenter } = useReactFlow();

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length === 0) {
      setResults([]);
      return;
    }

    const filtered = nodes.filter((node) =>
      node.data?.label?.toLowerCase().includes(val.toLowerCase())
    );
    setResults(filtered);
  };

  const handleSelect = (node) => {
    const offsetX = 60; // shift right
    const offsetY = 45;  // shift down
    const { x, y } = node.position;
    setCenter(x + offsetX, y + offsetY, {
      zoom: 2,
      duration: 800,
    });
    setQuery('');
    setResults([]);
  };

  return (
    <div style={{ position: 'absolute', top: 15, left: 270, zIndex: 1000 }}>
      <input
        type="text"
        placeholder="🔍 Search nodes..."
        value={query}
        onChange={handleSearch}
        style={{
          padding: '10px 15px',
          borderRadius: '20px', // Soft, rounded corners
          border: '1px solid #ddd',
          width: '220px',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        onFocus={(e) => e.target.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)'}
        onBlur={(e) => e.target.style.boxShadow = 'none'}
      />
      {results.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '5px 0',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
            maxHeight: '200px',
            overflowY: 'auto',
            position: 'absolute',
            width: '220px',
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)', // Soft shadow for depth
            zIndex: 1100,
          }}
        >
          {results.map((node) => (
            <li
              key={node.id}
              onClick={() => handleSelect(node)}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f1f1',
                fontSize: '14px',
                transition: 'background-color 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f8f8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {node.data?.label || node.id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;

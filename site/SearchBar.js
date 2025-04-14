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
    const { x, y } = node.position;
    setCenter(x, y, {
      zoom: 2,
      duration: 800,
    });
    setQuery('');
    setResults([]);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 250, zIndex: 1000 }}>
      <input
        type="text"
        placeholder="🔍 Search nodes..."
        value={query}
        onChange={handleSearch}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          width: '200px',
        }}
      />
      {results.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '5px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
            maxHeight: '200px',
            overflowY: 'auto',
            position: 'absolute',
            width: '200px',
          }}
        >
          {results.map((node) => (
            <li
              key={node.id}
              onClick={() => handleSelect(node)}
              style={{
                padding: '5px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
              }}
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

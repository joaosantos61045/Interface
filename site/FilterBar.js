import React, { useState, useEffect } from 'react';

const nodeTypes = ['Variable', 'Definition', 'Action', 'Table', 'HTML'];

const FilterBar = ({ nodes = [], setNodes }) => {
  const [activeFilters, setActiveFilters] = useState(new Set(nodeTypes));

  const toggleFilter = (type) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      newFilters.has(type) ? newFilters.delete(type) : newFilters.add(type);
      return newFilters;
    });
  };

  useEffect(() => {
    if (!Array.isArray(nodes)) return;

   
  }, [activeFilters, nodes, setNodes]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '1150px',
        zIndex: 1100,
        background: '#fff',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
      }}
    >
      {nodeTypes.map((type) => (
        <label
          key={type}
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={activeFilters.has(type)}
            onChange={() => toggleFilter(type)}
            style={{ marginRight: '6px' }}
          />
          {type}
        </label>
      ))}
    </div>
  );
};

export default FilterBar;

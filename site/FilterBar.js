import React from 'react';
import useStore from './store/store.js';

const nodeTypes = ['Variable', 'Definition', 'Action', 'Table', 'HTML', 'Module'];

const FilterBar = () => {
  const activeFilters = useStore((state) => state.activeFilters);
  const toggleFilter = useStore((state) => state.toggleFilter);

  return (
    <div
      style={{
        position: 'absolute',
        top: '15px',
        right: '350px', // Changed from left: 1150px
        zIndex: 1100,
        background: '#fff',
        padding: '10px 15px',
        borderRadius: '20px',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        maxWidth: '90vw', // Prevent overflow
        minWidth: '200px',
        width: 'auto',
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
            whiteSpace: 'nowrap',
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

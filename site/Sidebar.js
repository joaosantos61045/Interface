import { useDnD } from './DnDContext';
import React, { useState } from "react";

const Sidebar = () => {
  const [_, setType] = useDnD();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State to track sidebar collapse/expand
  
  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div
      style={{
        background: "#fff",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        padding: "10px",
        width: isSidebarOpen ? "220px" : "50px", // Adjust width based on collapse state
        position: "absolute",
        top: "0px", // Adjust this value to place Sidebar below the SearchBar
        left: 0, 
        zIndex: 1000,
        borderRadius: "8px",
        transition: "width 0.3s ease-in-out", // Smooth transition for collapse/expand
      }}
    >
      {/* Button to toggle the sidebar */}
      <button
        onClick={toggleSidebar}
        style={{
          backgroundColor: "#007BFF",
          color: "white",
          border: "1px solid ",
          padding: "8px",
          cursor: "pointer",
          fontSize: "14px",
          marginBottom: "5px",
          borderRadius: "4px",
          width: "100%",
        }}
      >
        {isSidebarOpen ? "Collapse" : "Open"}
      </button>

      {/* Sidebar content */}
      {isSidebarOpen && (
        <div>
          <aside>
            <div className="description">Drag these nodes to the canvas.</div>

            {/* Custom-shaped nodes */}
            <div className="dndnode variable shape-circle" onDragStart={(event) => onDragStart(event, 'Variable')} draggable>
              Variable
            </div>
            <div className="dndnode definition shape-diamond" onDragStart={(event) => onDragStart(event, 'Definition')} draggable>
              Definition
            </div>
            <div className="dndnode action shape-hexagon" onDragStart={(event) => onDragStart(event, 'Action')} draggable>
              Action
            </div>
            <div className="dndnode table shape-rectangle" onDragStart={(event) => onDragStart(event, 'Table')} draggable>
              Table
            </div>
            <div className="dndnode html shape-triangle" onDragStart={(event) => onDragStart(event, 'HTML')} draggable>
              HTML
            </div>
          </aside>
        </div>
      )}

      {/* Styling for custom shapes */}
      <style>
        {`
          .dndnode {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            margin: 10px 0;
            padding: 10px;
            font-weight: bold;
            text-align: center;
            background: #eee;
            transition: transform 0.2s ease-in-out;
          }
          .dndnode:hover {
            transform: scale(1.05);
          }

          /* Shape Styles */
          .shape-circle { width: 80px; height: 80px; border-radius: 50%; background: #ffcc00; }
          .shape-hexagon { width: 90px; height: 52px; background: #4caf50; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
          .shape-triangle { width: 0; height: 0; border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 70px solid #f44336; }
          .shape-rectangle { width: 100px; height: 60px; background: #2196F3; border-radius: 5px; }
          .shape-diamond { width: 70px; height: 70px; background: #9c27b0; transform: rotate(45deg); }
        `}
      </style>
    </div>
  );
};

export default Sidebar;

import { useDnD } from './DnDContext';
import React, { useState } from "react";

const Sidebar = () => {
  const [_, setType] = useDnD();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div
      style={{
        background: "#f9f9fb",
        boxShadow: "0px 4px 20px rgba(0,0,0,0.1)",
        padding: "12px",
        width: isSidebarOpen ? "240px" : "60px",
        position: "absolute",
        top: "10px",
        left: "10px",
        zIndex: 1000,
        borderRadius: "10px",
        transition: "width 0.3s ease",
        overflow: "hidden",
      }}
    >
      <button
        onClick={toggleSidebar}
        style={{
          backgroundColor: "#6366f1",
          color: "white",
          border: "none",
          padding: "10px",
          cursor: "pointer",
          fontSize: "14px",
          borderRadius: "6px",
          width: "100%",
          marginBottom: "12px",
          transition: "background-color 0.3s",
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "#4f46e5")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "#6366f1")}
      >
        {isSidebarOpen ? "Collapse" : "Open"}
      </button>

      {isSidebarOpen && (
        <div>
          <aside>
            <div
              style={{
                fontSize: "13px",
                marginBottom: "16px",
                color: "#555",
                textAlign: "center",
              }}
            >
              Drag a node into the canvas
            </div>

            {/* Draggable Node Buttons */}
            <div className="dndnode variable shape-circle" onDragStart={(e) => onDragStart(e, 'Variable')} draggable>
              Variable
            </div>
            <div className="dndnode definition shape-diamond" onDragStart={(e) => onDragStart(e, 'Definition')} draggable>
              Definition
            </div>
            <div className="dndnode action shape-hexagon" onDragStart={(e) => onDragStart(e, 'Action')} draggable>
              Action
            </div>
            <div className="dndnode table shape-rectangle" onDragStart={(e) => onDragStart(e, 'Table')} draggable>
              Table
            </div>
            <div className="dndnode html shape-triangle" onDragStart={(e) => onDragStart(e, 'HTML')} draggable>
              HTML
            </div>
            <div className="dndnode group shape-rounded" onDragStart={(e) => onDragStart(e, 'group')} draggable>
              Module
            </div>
          </aside>
        </div>
      )}

      {/* Node Styles */}
      <style>
        {`
          .dndnode {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            margin: 8px 0;
            padding: 12px;
            font-weight: 600;
            text-align: center;
            background: #ffffff;
            color: #333;
            box-shadow: 0px 2px 6px rgba(0,0,0,0.1);
            border-radius: 8px;
            transition: all 0.2s ease;
          }
          .dndnode:hover {
            transform: scale(1.05);
            background: #f0f0f0;
          }

          /* Shape Styles */
          .shape-circle { width: 80px; height: 80px; border-radius: 50%; background: #ffcd38; }
          .shape-hexagon { width: 90px; height: 52px; background: #34d399; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
          .shape-triangle { width: 0; height: 0; border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 70px solid #f87171; }
          .shape-rectangle { width: 100px; height: 60px; background: #60a5fa; border-radius: 8px; }
          .shape-diamond { width: 70px; height: 70px; background: #c084fc; transform: rotate(45deg); }
          .shape-rounded { width: 100px; height: 60px; background: #facc15; border-radius: 12px; }
        `}
      </style>
    </div>
  );
};

export default Sidebar;

import { useDnD } from './DnDContext';
import React, { useState } from "react";
const Sidebar = () => {
  const [_, setType] = useDnD();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
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
            <div className="dndnode variable shape-rounded-square" onDragStart={(e) => onDragStart(e, "Variable")} draggable>
              Variable
            </div>
            <div className="dndnode definition shape-diamond " onDragStart={(e) => onDragStart(e, "Definition")} draggable>
              Definition
            </div>
            <div className="dndnode action shape-hexagon" onDragStart={(e) => onDragStart(e, "Action")} draggable>
              Action
            </div>
            <div className="dndnode table shape-table" onDragStart={(e) => onDragStart(e, "Table")} draggable>
              Table
            </div>
            <div className="dndnode html shape-document" onDragStart={(e) => onDragStart(e, "HTML")} draggable>
              HTML
            </div>
            <div className="dndnode group shape-rounded" onDragStart={(e) => onDragStart(e, "Module")} draggable>
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
            padding: 14px;
            font-weight: 600;
            text-align: center;
            background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
            color: #111827;
            box-shadow: 0px 2px 6px rgba(0,0,0,0.08);
            border-radius: 10px;
            transition: all 0.2s ease;
          }
          .dndnode:hover {
            transform: scale(1.05);
            background: #e5e7eb;
          }

          /* Shape Styles */
          .shape-rounded-square { width: 80px; height: 80px; border-radius: 12px; background:rgb(235, 139, 250); }
          .shape-hexagon { width: 90px; height: 52px; background: #f87171; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
          .shape-rectangle { width: 100px; height: 60px; background: #60a5fa; border-radius: 8px; }
          .shape-diamond { width: 70px; height: 70px; background:rgb(73, 202, 99); transform: rotate(45deg); }
          .shape-rounded { width: 100px; height: 60px; background: #fbbf24; border-radius: 16px; }

          .shape-document {
            width: 60px;
            height: 80px;
            background:rgb(255, 113, 57);
            border-radius: 6px;
            position: relative;
          }
          .shape-document::before {
            content: "";
            position: absolute;
            top: 8px;
            left: 8px;
            width: 44px;
            height: 6px;
            background: white;
            border-radius: 2px;
          }
          .shape-document::after {
            content: "";
            position: absolute;
            top: 22px;
            left: 8px;
            width: 36px;
            height: 6px;
            background: white;
            border-radius: 2px;
          }

          .shape-table {
            width: 100px;
            height: 60px;
            background: #38bdf8;
            border-radius: 8px;
            position: relative;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 2px;
            padding: 6px;
          }
          .shape-table::before,
          .shape-table::after {
            content: "";
            background: white;
          }
          .shape-table div {
            background: white;
            border-radius: 2px;
          }
        `}
      </style>
    </div>
  );
};

export default Sidebar;

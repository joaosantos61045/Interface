import { useDnD } from './DnDContext';
import React from "react";
import { useFloating, offset, shift } from "@floating-ui/react";

const Sidebar = () => {
  const [_, setType] = useDnD();
  
  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const { refs, floatingStyles } = useFloating({
    placement: "left-start",
    middleware: [offset(10), shift()],
  });

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        background: "#fff",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        padding: "10px",
        width: "220px",
        position: "absolute",
        zIndex: 1000,
        borderRadius: "8px",
      }}
    >
      <h3>Sidebar</h3>
      <p>Drag elements to the canvas</p>
      <aside>
        <div className="description">Drag these nodes to the canvas.</div>

        {/* Input, Default, and Output remain the same */}
        <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'input')} draggable>
          Input Node
        </div>
        <div className="dndnode" onDragStart={(event) => onDragStart(event, 'default')} draggable>
          Default Node
        </div>
        <div className="dndnode output" onDragStart={(event) => onDragStart(event, 'output')} draggable>
          Output Node
        </div>

        {/* Nodes with custom shapes */}
        <div className="dndnode variable shape-circle" onDragStart={(event) => onDragStart(event, 'variable')} draggable>
          Variable
        </div>
        <div className="dndnode definition shape-diamond " onDragStart={(event) => onDragStart(event, 'definition')} draggable>
          Definition
        </div>
        <div className="dndnode action shape-hexagon" onDragStart={(event) => onDragStart(event, 'action')} draggable>
          Action
        </div>
        <div className="dndnode table shape-rectangle" onDragStart={(event) => onDragStart(event, 'table')} draggable>
          Table
        </div>
        <div className="dndnode html shape-triangle" onDragStart={(event) => onDragStart(event, 'html')} draggable>
          HTML
        </div>
      </aside>

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

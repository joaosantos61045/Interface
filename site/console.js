import React, { useState, useEffect } from "react";
import { useFloating, offset, shift } from "@floating-ui/react";

const Console = () => {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [offset(10), shift()],
  });

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("send_button").click();
    }
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSendClick = () => {
    console.log("Input sent:", input);
    setInput("");
  };

  const toggleConsole = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const inputEl = document.getElementById("user_input");
    if (inputEl) {
      inputEl.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (inputEl) inputEl.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={refs.setReference}
      style={{
        position: "absolute",
        right: "331px",
        zIndex: 1000,
      }}
    >
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          background: "#333",
          color: "white",
          padding: "10px",
          borderRadius: "10px",
          width: isOpen ? "300px" : "60px",
          transition: "width 0.3s ease",
          overflow: "hidden",
          boxShadow: "0px 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleConsole}
          style={{
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            padding: "8px",
            cursor: "pointer",
            fontSize: "14px",
            borderRadius: "6px",
            width: "100%",
            marginBottom: isOpen ? "12px" : "0",
            transition: "background-color 0.3s",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#4f46e5")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#6366f1")}
        >
          {isOpen ? "X" : "☰"}
        </button>

        {/* Console content */}
        {isOpen && (
          <div>
            <div
              id="console"
              style={{
                minHeight: "100px",
                marginBottom: "10px",
                background: "#222",
                padding: "8px",
                borderRadius: "6px",
                overflowY: "auto",
                maxHeight: "400px",
              }}
            ></div>
            <input
              type="text"
              id="user_input"
              placeholder="Type a message"
              value={input}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "none",
                marginBottom: "8px",
              }}
            />
            <button
              id="send_button"
              onClick={handleSendClick}
              style={{
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "6px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Console;

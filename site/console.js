import React, { useState, useEffect } from "react";
import { useFloating, offset, shift } from "@floating-ui/react";

const Console = () => {
    const [input, setInput] = useState("");
    const { refs, floatingStyles } = useFloating({
        placement: "right-start",
        middleware: [offset(10), shift()],
    });

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevents form submission
            document.getElementById("send_button").click();
        }
    };

    const handleInputChange = (event) => {
        setInput(event.target.value);
    };

    const handleSendClick = () => {
        console.log("Input sent:", input);
        setInput(""); // Clear input after sending
    };

    useEffect(() => {
        document.getElementById("user_input").addEventListener("keydown", handleKeyDown);
        return () => {
            document.getElementById("user_input").removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div ref={refs.setReference} style={{ position: "relative", bottom: "1000px", right: "350px", zIndex: 1000 }}>
            <div ref={refs.setFloating} style={{ ...floatingStyles, background: "#333", color: "white", padding: "10px", borderRadius: "5px", width: "300px" }}>
                <div id="console"></div>
                <input
                    type="text"
                    id="user_input"
                    placeholder="Type a message"
                    value={input}
                    onChange={handleInputChange}
                />
                <button id="send_button" onClick={handleSendClick}>Send</button>
            </div>
        </div>
    );
};

export default Console;

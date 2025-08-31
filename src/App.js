import React, { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const textBufferRef = useRef(""); // holds current streaming text

  useEffect(() => {
    wsRef.current = new WebSocket("wss://r1iwk0c5l6.execute-api.ap-south-1.amazonaws.com/dev/");
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket");
    };

    wsRef.current.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "text") {
            // append stream chunks into one buffer
            textBufferRef.current += msg.data;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: textBufferRef.current,
              };
              return updated;
            });
          } else if (msg.type === "done") {
            // reset buffer after stream ends
            textBufferRef.current = "";
          }
        } catch (e) {
          console.error("Error parsing JSON", e);
        }
      } else {
        // Binary audio
        playPCM(event.data);
      }
    };

    return () => {
      wsRef.current.close();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    // add placeholder message for streaming updates
    setMessages((prev) => [...prev, { text: "" }]);
    wsRef.current.send(
      JSON.stringify({ action: "sendMessage", message: input })
    );
    setInput("");
  };

  const playPCM = (arrayBuffer) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    const audioCtx = audioCtxRef.current;

    audioCtx.decodeAudioData(
      arrayBuffer.slice(0),
      (buffer) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
      },
      (err) => console.error("decodeAudioData error", err)
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Realtime Stream Chat</h2>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          minHeight: "200px",
          marginBottom: "10px",
          whiteSpace: "pre-wrap",
        }}
      >
        {messages.map((m, idx) => (
          <div key={idx}>{m.text}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: "70%" }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;

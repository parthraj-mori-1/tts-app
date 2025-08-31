import React, { useEffect, useRef, useState } from "react";

function App() {
  const wsRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket("wss://r1iwk0c5l6.execute-api.ap-south-1.amazonaws.com/dev/");

    // Tell WS to expect both text and binary
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onmessage = (event) => {
      // Case 1: JSON text response
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          setMessages((prev) => [...prev, msg.message]);
        } catch (err) {
          console.error("Error parsing JSON:", err);
        }
      }
      // Case 2: Audio (binary PCM data)
      else if (event.data instanceof ArrayBuffer) {
        playPCM(event.data);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendMessage = (input) => {
    wsRef.current.send(JSON.stringify({ action: "sendMessage", message: input }));
  };

  // ---- 🔊 Play PCM ----
  const playPCM = async (arrayBuffer) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000, // Match what Polly/Lambda sends
      });
    }

    const audioCtx = audioCtxRef.current;

    // Convert 16-bit PCM -> Float32
    const pcm16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    // Create buffer
    const audioBuffer = audioCtx.createBuffer(1, float32.length, 16000);
    audioBuffer.getChannelData(0).set(float32);

    // Play
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    sourceRef.current = source;
  };

  return (
    <div>
      <h1>WebSocket Chat + TTS</h1>
      <button onClick={() => sendMessage("Hello, how are you?")}>Send Hello</button>
      <div>
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
    </div>
  );
}

export default App;

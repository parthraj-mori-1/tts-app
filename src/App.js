import React, { useEffect, useRef, useState } from "react";

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    // Connect WebSocket
    const ws = new WebSocket("wss://r1iwk0c5l6.execute-api.ap-south-1.amazonaws.com/dev");

    ws.binaryType = "arraybuffer"; // important for audio
    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onclose = () => console.log("❌ WebSocket disconnected");

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        // text message
        try {
          const data = JSON.parse(event.data);
          if (data.type === "text") {
            setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
          }
        } catch (err) {
          console.error("Error parsing:", err);
        }
      } else {
        // binary PCM audio
        playPCM(event.data);
      }
    };

    wsRef.current = ws;

    return () => ws.close();
  }, []);

  const playPCM = (arrayBuffer) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000, // must match Polly output
      });
    }

    const audioCtx = audioCtxRef.current;

    // Convert PCM Int16 -> Float32 for Web Audio
    const buffer = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      float32[i] = buffer[i] / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32.length, 16000);
    audioBuffer.copyToChannel(float32, 0);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();

    sourceRef.current = source;
  };

  const sendMessage = () => {
    if (input.trim() && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: input }));
      setMessages((prev) => [...prev, { role: "user", text: input }]);
      setInput("");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">💬 Chat with AI (Text + Audio)</h1>
      <div className="border rounded-lg p-4 h-80 overflow-y-auto bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`my-2 ${msg.role === "user" ? "text-blue-600" : "text-green-600"}`}>
            <b>{msg.role}:</b> {msg.text}
          </div>
        ))}
      </div>

      <div className="flex mt-4">
        <input
          className="flex-1 border rounded-l-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 rounded-r-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}

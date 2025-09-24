"use client";

import { useState } from "react";

export default function ChatInput({ onSend }: { onSend?: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend?.(text);
        setText("");
      }}
      style={{ display: "flex", gap: 8 }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message"
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit">Send</button>
    </form>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  chapterId: string;
}

const MIN_HEIGHT = 160;
const DEFAULT_HEIGHT = 288;

export default function LessonChat({ chapterId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opener, setOpener] = useState<string | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  // Fetch opener in background on mount
  useEffect(() => {
    fetch("/api/chat-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, generateOpener: true }),
    })
      .then((r) => r.json())
      .then((data) => setOpener(data.reply ?? null))
      .catch(() => null);
  }, [chapterId]);

  // When panel opens for the first time, inject opener as first message
  useEffect(() => {
    if (isOpen && opener && messages.length === 0) {
      setMessages([{ role: "assistant", content: opener }]);
    }
  }, [isOpen, opener, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, messages: next }),
    });

    if (res.ok) {
      const { reply } = await res.json();
      setMessages([...next, { role: "assistant", content: reply }]);
    }
    setLoading(false);
  }

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };

    function onMove(ev: MouseEvent) {
      if (!dragState.current) return;
      const delta = dragState.current.startY - ev.clientY;
      setHeight(Math.max(MIN_HEIGHT, dragState.current.startHeight + delta));
    }

    function onUp() {
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 shrink-0">
      {/* Toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium">Ask a question about this lesson</span>
        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col border-t border-gray-200" style={{ height }}>
          {/* Drag handle */}
          <div
            onMouseDown={startDrag}
            className="h-1.5 bg-gray-200 hover:bg-gray-400 cursor-ns-resize transition-colors shrink-0"
            title="Drag to resize"
          />
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center pt-8">
                {opener === null ? "Loading…" : ""}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-black text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-2 flex gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question…"
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

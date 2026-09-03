"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

export interface LessonViewHandle {
  print: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ChatMode = "closed" | "open" | "fullscreen";

const MIN_HEIGHT = 160;
const DEFAULT_HEIGHT = 288;

interface Props {
  html: string;
  chapterId: string;
  title: string;
}

function IconExpand() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
  );
}

function IconCompress() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    </svg>
  );
}

const LessonView = forwardRef<LessonViewHandle, Props>(function LessonView({ html, chapterId, title }, ref) {
  const [chatMode, setChatMode] = useState<ChatMode>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opener, setOpener] = useState<string | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

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

  useEffect(() => {
    if (chatMode !== "closed" && opener && messages.length === 0) {
      setMessages([{ role: "assistant", content: opener }]);
    }
  }, [chatMode, opener, messages.length]);

  useEffect(() => {
    if (chatMode !== "closed") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatMode]);

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

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function printLesson() {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || !iframe.contentWindow) return;
    const doc = iframe.contentDocument;
    let style = doc.getElementById("__print_color_adjust__");
    if (!style) {
      style = doc.createElement("style");
      style.id = "__print_color_adjust__";
      style.textContent = "@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }";
      doc.head.appendChild(style);
    }
    iframe.contentWindow.print();
  }

  useImperativeHandle(ref, () => ({ print: printLesson }));

  const chatContent = (
    <>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0">
        <div className="px-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center pt-8">
              {opener === null ? "Loading…" : ""}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-50 border border-gray-200 text-gray-800"
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
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 py-2 bg-white shrink-0">
        <div className="px-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question…"
            disabled={loading}
            className="flex-1 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 placeholder:text-gray-400"
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
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Iframe — hidden in fullscreen */}
      {chatMode !== "fullscreen" && (
        <div className="flex-1 relative min-h-0">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            className="absolute inset-0 w-full h-full border-0"
            title={title}
          />
        </div>
      )}

      {/* Chat section */}
      {chatMode === "fullscreen" ? (
        <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200 bg-gray-50">
          {/* Fullscreen header */}
          <div className="border-b border-gray-200 shrink-0">
            <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Chat with your teacher</span>
            <button
              onClick={() => setChatMode("open")}
              title="Exit fullscreen"
              className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
            >
              <IconCompress />
            </button>
            </div>
          </div>
          {chatContent}
        </div>
      ) : (
        <div className="shrink-0 px-4 pt-3 pb-4" style={{ backgroundColor: "#e0e7f1" }}>
          {/* Constrained chat card */}
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Toggle bar */}
            <button
              onClick={() => setChatMode(chatMode === "closed" ? "open" : "closed")}
              className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Chat with your teacher</span>
              <div className="flex items-center gap-2">
                {chatMode === "open" && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setChatMode("fullscreen"); }}
                    title="Fullscreen"
                    className="text-gray-400 hover:text-gray-700 p-0.5 rounded hover:bg-gray-200"
                  >
                    <IconExpand />
                  </span>
                )}
                <span className="text-xs">{chatMode === "closed" ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Open panel */}
            {chatMode === "open" && (
              <div className="flex flex-col border-t border-gray-200" style={{ height }}>
                {/* Drag handle */}
                <div
                  onMouseDown={startDrag}
                  className="h-1.5 bg-gray-200 hover:bg-gray-400 cursor-ns-resize transition-colors shrink-0"
                  title="Drag to resize"
                />
                {chatContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default LessonView;

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  courseId: string;
  chapterId: string;
  completed: boolean;
  learningNote: string;
  onRegenerate?: () => void;
}

export default function LessonActions({ courseId, chapterId, completed, learningNote, onRegenerate }: Props) {
  const router = useRouter();
  const [note, setNote] = useState(learningNote);
  const [isDone, setIsDone] = useState(completed);
  const [showRegenForm, setShowRegenForm] = useState(false);
  const [regenHint, setRegenHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markComplete() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/complete-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, completed: true, learningNote: note }),
    });
    if (res.ok) {
      setIsDone(true);
      router.push(`/courses/${courseId}`);
    } else {
      setError("Failed to save progress");
    }
    setLoading(false);
  }

  async function regenerate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/regenerate-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, hint: regenHint }),
    });
    if (res.ok) {
      setShowRegenForm(false);
      setRegenHint("");
      onRegenerate?.();
    } else {
      setError("Failed to regenerate lesson");
    }
    setLoading(false);
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4 shrink-0">
      {showRegenForm ? (
        <div className="space-y-3 max-w-2xl mx-auto">
          <label className="block text-sm font-medium">
            What should be different? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={regenHint}
            onChange={(e) => setRegenHint(e.target.value)}
            placeholder="e.g. I didn't get the part about lifetimes"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black resize-none placeholder:text-gray-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegenForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={regenerate}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 max-w-2xl mx-auto">
          <div className="flex-1">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a reflection note (optional)…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => setShowRegenForm(true)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-400 shrink-0"
          >
            Regenerate
          </button>
          <button
            onClick={markComplete}
            disabled={loading || isDone}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 shrink-0"
          >
            {isDone ? "Completed ✓" : loading ? "Saving…" : "Mark complete"}
          </button>
        </div>
      )}
      {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
    </div>
  );
}

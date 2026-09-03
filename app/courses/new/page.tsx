"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingScreen from "../LoadingScreen";

type Step = "form" | "generating" | "review";
type Chapter = { title: string; topic: string };
type SourceType = "text" | "youtube" | "pdf";
type SourceStatus = "processing" | "ready" | "error";

interface Source {
  id: string;
  type: SourceType;
  label: string;
  summary: string;
  status: SourceStatus;
  error?: string;
}

interface StructuredSummary {
  topics?: string[];
  key_concepts?: string[];
  examples?: string[];
  core_argument?: string;
  scope?: string;
}

const GENERATING_STEPS = [
  "Analysing your learning goal…",
  "Identifying key concepts…",
  "Researching the subject area…",
  "Mapping knowledge dependencies…",
  "Designing a chapter structure…",
  "Balancing theory and practice…",
  "Sequencing topics for best flow…",
  "Refining chapter descriptions…",
  "Reviewing the course outline…",
  "Thinking about what you really need…",
  "Sketching the learning journey…",
  "Scoping the subject matter…",
  "Deciding where to start…",
  "Untangling the prerequisites…",
  "Grouping related ideas together…",
  "Finding the natural progression…",
  "Weighing depth versus breadth…",
  "Considering your end goal…",
  "Drafting an initial outline…",
  "Questioning the chapter order…",
  "Expanding the early chapters…",
  "Trimming the obvious fluff…",
  "Adding a practical angle…",
  "Thinking about pacing…",
  "Ensuring a smooth on-ramp…",
  "Stress-testing the structure…",
  "Plotting the conceptual arc…",
  "Checking nothing important is missing…",
  "Shaping the capstone chapters…",
  "Building bridges between topics…",
  "Revisiting the opening chapter…",
  "Questioning the scope…",
  "Making sure theory meets practice…",
  "Labelling the chapters clearly…",
  "Writing better topic descriptions…",
  "Thinking about what trips learners up…",
  "Reordering for better flow…",
  "Tightening the chapter summaries…",
  "Looking for logical gaps…",
  "Anchoring abstract ideas to examples…",
  "Considering different learning styles…",
  "Tracing the dependency graph…",
  "Polishing the titles…",
  "Imagining what you will be able to do…",
  "Grounding the theory in real-world use…",
  "Splitting one big chapter into two…",
  "Merging the overlapping parts…",
  "Checking the difficulty curve…",
  "Adding a challenge chapter…",
  "Thinking about what to leave out…",
  "Framing the motivation for each chapter…",
  "Reviewing the first draft…",
  "Questioning every assumption…",
  "Zooming out to see the whole picture…",
  "Zooming in on the tricky parts…",
  "Rewriting a chapter description…",
  "Cross-checking against your mission…",
  "Asking what a pro would expect…",
  "Asking what a beginner would need…",
  "Filling in the gaps…",
  "Ensuring each chapter earns its place…",
  "Placing the hardest concept at the right moment…",
  "Building up to the most important idea…",
  "Cutting anything that slows you down…",
  "Adding context where it was missing…",
  "Rethinking chapter three…",
  "Rethinking chapter seven…",
  "Giving each chapter a clear purpose…",
  "Imagining you just finished the course…",
  "Working backwards from your goal…",
  "Aligning chapters to real skills…",
  "Making the outline feel inevitable…",
  "Sharpening the final chapters…",
  "Considering which order surprises and delights…",
  "Reading the outline one more time…",
  "Preparing to hand this off to you…",
  "Just a few more decisions to make…",
  "Almost locked in…",
  "Combing through one last time…",
  "Nearly there…",
];

function SourceSummaryView({ summary }: { summary: string }) {
  let parsed: StructuredSummary = {};
  try {
    parsed = JSON.parse(summary);
  } catch {
    return <p className="text-xs text-gray-500 mt-2">{summary}</p>;
  }

  return (
    <div className="mt-3 space-y-2 text-xs text-gray-600">
      {parsed.core_argument && (
        <p><span className="font-medium text-gray-800">Core argument: </span>{parsed.core_argument}</p>
      )}
      {parsed.topics && parsed.topics.length > 0 && (
        <p><span className="font-medium text-gray-800">Topics: </span>{parsed.topics.join(", ")}</p>
      )}
      {parsed.key_concepts && parsed.key_concepts.length > 0 && (
        <p><span className="font-medium text-gray-800">Key concepts: </span>{parsed.key_concepts.join(", ")}</p>
      )}
      {parsed.scope && (
        <p className="text-gray-400 italic">{parsed.scope}</p>
      )}
    </div>
  );
}

function SourceCard({ source, onRemove }: { source: Source; onRemove: () => void }) {
  const typeLabel = source.type === "youtube" ? "YouTube" : source.type === "pdf" ? "PDF" : "Text";
  return (
    <div className="border border-gray-200 rounded-lg p-4 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 shrink-0">{typeLabel}</span>
          <span className="text-sm font-medium truncate">{source.label}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {source.status === "processing" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin shrink-0" />
          Analysing content…
        </div>
      )}

      {source.status === "error" && (
        <p className="mt-2 text-xs text-red-500">{source.error}</p>
      )}

      {source.status === "ready" && (
        <SourceSummaryView summary={source.summary} />
      )}
    </div>
  );
}

type AddSourceType = SourceType | null;

export default function NewCoursePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [mission, setMission] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sources state
  const [sources, setSources] = useState<Source[]>([]);
  const [addingType, setAddingType] = useState<AddSourceType>(null);
  const [inputText, setInputText] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAddForm() {
    setAddingType(null);
    setInputText("");
    setInputLabel("");
    setInputUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function summariseText(id: string, text: string) {
    const res = await fetch("/api/summarise-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setSources((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "error", error: data.error ?? "Failed to analyse content" } : s)
      );
    } else {
      setSources((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "ready", summary: JSON.stringify(data.summary) } : s)
      );
    }
  }

  async function handleAddText() {
    if (!inputText.trim()) return;
    const label = inputLabel.trim() || "Pasted text";
    const id = crypto.randomUUID();
    const newSource: Source = { id, type: "text", label, summary: "", status: "processing" };
    setSources((prev) => [...prev, newSource]);
    resetAddForm();
    await summariseText(id, inputText);
  }

  async function handleAddYoutube() {
    if (!inputUrl.trim()) return;
    const label = inputUrl.trim();
    const id = crypto.randomUUID();
    const newSource: Source = { id, type: "youtube", label, summary: "", status: "processing" };
    setSources((prev) => [...prev, newSource]);
    resetAddForm();

    const extractRes = await fetch("/api/extract-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: inputUrl.trim() }),
    });
    const extractData = await extractRes.json();
    if (!extractRes.ok || extractData.error) {
      setSources((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "error", error: extractData.error ?? "Failed to fetch transcript" } : s)
      );
      return;
    }
    await summariseText(id, extractData.text);
  }

  async function handleAddPdf(file: File) {
    const label = file.name;
    const id = crypto.randomUUID();
    const newSource: Source = { id, type: "pdf", label, summary: "", status: "processing" };
    setSources((prev) => [...prev, newSource]);
    resetAddForm();

    const formData = new FormData();
    formData.append("file", file);
    const extractRes = await fetch("/api/extract-pdf", { method: "POST", body: formData });
    const extractData = await extractRes.json();
    if (!extractRes.ok || extractData.error) {
      setSources((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "error", error: extractData.error ?? "Failed to extract PDF" } : s)
      );
      return;
    }
    await summariseText(id, extractData.text);
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("generating");

    const readySources = sources
      .filter((s) => s.status === "ready")
      .map((s) => ({ label: s.label, summary: s.summary }));

    try {
      const res = await fetch("/api/generate-chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mission, sources: readySources }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate chapters");
        setStep("form");
        return;
      }

      setChapters(data.chapters);
      setStep("review");
    } catch {
      setError("Failed to generate chapters");
      setStep("form");
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({ title, mission, owner_id: user.id })
      .select("id")
      .single();

    if (courseError || !course) {
      setError(courseError?.message ?? "Failed to create course");
      setSaving(false);
      return;
    }

    if (chapters.length > 0) {
      const rows = chapters.map((ch, i) => ({
        course_id: course.id,
        position: i + 1,
        title: ch.title,
        topic: ch.topic,
      }));
      const { error: chaptersError } = await supabase.from("chapters").insert(rows);
      if (chaptersError) {
        setError(chaptersError.message);
        setSaving(false);
        return;
      }
    }

    const readySources = sources.filter((s) => s.status === "ready");
    if (readySources.length > 0) {
      const sourceRows = readySources.map((s) => ({
        course_id: course.id,
        source_type: s.type,
        label: s.label,
        summary: s.summary,
      }));
      const { error: sourcesError } = await supabase.from("course_sources").insert(sourceRows);
      if (sourcesError) {
        setError(sourcesError.message);
        setSaving(false);
        return;
      }
    }

    router.push(`/courses/${course.id}`);
  }

  // Step 2: Generating
  if (step === "generating") {
    return (
      <div className="min-h-screen flex">
        <LoadingScreen
          steps={GENERATING_STEPS}
          title="Building your course outline"
        />
      </div>
    );
  }

  // Step 3: Review
  if (step === "review") {
    return (
      <div className="w-full max-w-[1024px] mx-auto px-8 py-12">
        <button
          onClick={() => setStep("form")}
          className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">{mission}</p>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Chapters ({chapters.length})</h2>
        </div>

        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-4">
          {chapters.map((ch, i) => (
            <li key={i} className="flex items-start gap-2 px-3 py-3">
              <span className="text-xs text-gray-400 shrink-0 mt-1 w-5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <input
                  value={ch.title}
                  onChange={(e) => {
                    const updated = [...chapters];
                    updated[i] = { ...updated[i], title: e.target.value };
                    setChapters(updated);
                  }}
                  className="w-full text-sm font-medium bg-transparent focus:outline-none"
                />
                <input
                  value={ch.topic}
                  onChange={(e) => {
                    const updated = [...chapters];
                    updated[i] = { ...updated[i], topic: e.target.value };
                    setChapters(updated);
                  }}
                  className="w-full text-xs text-gray-500 bg-transparent focus:outline-none mt-0.5"
                />
              </div>
              <button
                type="button"
                onClick={() => setChapters(chapters.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-500 shrink-0 text-lg leading-none mt-0.5"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setChapters([...chapters, { title: "", topic: "" }])}
          className="text-sm text-blue-600 hover:text-blue-800 mb-8 block"
        >
          + Add chapter
        </button>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => router.push("/courses")}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || chapters.length === 0}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create course"}
          </button>
        </div>
      </div>
    );
  }

  const processingCount = sources.filter((s) => s.status === "processing").length;

  // Step 1: Form
  return (
    <div className="w-full max-w-[1024px] mx-auto px-8 py-12">
      <button
        onClick={() => router.push("/courses")}
        className="text-sm text-gray-500 hover:text-gray-800 mb-8 inline-block"
      >
        ← My courses
      </button>

      <h1 className="text-2xl font-bold mb-8">New course</h1>

      <form onSubmit={handleNext} className="space-y-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">What do you want to learn?</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Rust"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Why do you want to learn this?</label>
            <textarea
              required
              rows={4}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="e.g. I want to build a CLI tool for my team and learn systems programming"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
        </div>

        {/* Sources section */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Source material <span className="text-gray-400 font-normal">(optional)</span></label>
          </div>
          <p className="text-xs text-gray-400 mb-4">Add PDFs, YouTube transcripts, or text to ground the course in your specific content.</p>

          {sources.length > 0 && (
            <div className="space-y-3 mb-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onRemove={() => setSources((prev) => prev.filter((s) => s.id !== source.id))}
                />
              ))}
            </div>
          )}

          {/* Add source form */}
          {addingType === null ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddingType("text")}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600"
              >
                + Paste text
              </button>
              <button
                type="button"
                onClick={() => setAddingType("youtube")}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600"
              >
                + YouTube URL
              </button>
              <button
                type="button"
                onClick={() => { setAddingType("pdf"); setTimeout(() => fileInputRef.current?.click(), 0); }}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600"
              >
                + Upload PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAddPdf(file);
                }}
              />
            </div>
          ) : addingType === "text" ? (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Label (optional)</label>
                <input
                  value={inputLabel}
                  onChange={(e) => setInputLabel(e.target.value)}
                  placeholder="e.g. Lecture notes, Chapter 3"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Content</label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your text here…"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={resetAddForm} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                <button
                  type="button"
                  onClick={handleAddText}
                  disabled={!inputText.trim()}
                  className="px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
                >
                  Add source
                </button>
              </div>
            </div>
          ) : addingType === "youtube" ? (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">YouTube URL</label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={resetAddForm} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                <button
                  type="button"
                  onClick={handleAddYoutube}
                  disabled={!inputUrl.trim()}
                  className="px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40"
                >
                  Fetch transcript
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={processingCount > 0}
          className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {processingCount > 0 ? `Analysing ${processingCount} source${processingCount > 1 ? "s" : ""}…` : "Next →"}
        </button>
      </form>
    </div>
  );
}

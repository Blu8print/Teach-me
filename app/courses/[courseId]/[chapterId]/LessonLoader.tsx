"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LessonView, { LessonViewHandle } from "./LessonView";
import LessonActions from "./LessonActions";
import LoadingScreen from "../../LoadingScreen";

function IconPrint() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

function IconShare() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

const LESSON_STEPS = [
  "Preparing your lesson…",
  "Gathering relevant examples…",
  "Structuring the content…",
  "Writing explanations…",
  "Adding practice exercises…",
  "Tailoring to your learning goal…",
  "Formatting the lesson…",
  "Adding code samples…",
  "Reviewing for clarity…",
  "Thinking about the best angle…",
  "Consulting the knowledge base…",
  "Distilling the key ideas…",
  "Drafting the introduction…",
  "Building the narrative arc…",
  "Choosing illuminating examples…",
  "Connecting concepts together…",
  "Writing the core explanation…",
  "Selecting the right analogies…",
  "Crafting practice problems…",
  "Checking the logical flow…",
  "Adding depth to the theory…",
  "Polishing the prose…",
  "Cross-referencing the topic…",
  "Designing hands-on exercises…",
  "Embedding helpful hints…",
  "Simplifying complex ideas…",
  "Weaving in real-world context…",
  "Refining the examples…",
  "Ordering the sections…",
  "Making the tricky parts clearer…",
  "Adding visual structure…",
  "Filling in the details…",
  "Sharpening the definitions…",
  "Anchoring abstract ideas…",
  "Testing the explanations…",
  "Building momentum through the material…",
  "Tuning the difficulty level…",
  "Layering the concepts…",
  "Ensuring nothing is skipped…",
  "Adding summary points…",
  "Calibrating for your pace…",
  "Generating challenge questions…",
  "Thinking through edge cases…",
  "Writing the closing section…",
  "Smoothing the transitions…",
  "Making it engaging…",
  "Adding common pitfalls to avoid…",
  "Annotating the code samples…",
  "Verifying technical accuracy…",
  "Highlighting what matters most…",
  "Thinking deeper on this topic…",
  "Constructing a mental model…",
  "Planting seeds for future chapters…",
  "Framing the problem space…",
  "Expanding on the fundamentals…",
  "Adding scaffolding for the hard bits…",
  "Contemplating the best approach…",
  "Weaving the thread through…",
  "Ensuring examples actually run…",
  "Drafting the key takeaways…",
  "Stress-testing the explanations…",
  "Revisiting the opening hook…",
  "Finding a better metaphor…",
  "Ironing out any ambiguity…",
  "Inserting a well-placed aside…",
  "Making sure the exercises build on each other…",
  "Tracing the conceptual dependencies…",
  "Sprinkling in context…",
  "Cross-checking the terminology…",
  "Tightening the structure…",
  "Rereading for tone…",
  "Adding one more good example…",
  "Considering what a beginner might miss…",
  "Reconsidering the section order…",
  "Shaping the conclusion…",
  "Running a final check…",
  "Putting the finishing touches on…",
  "Almost there — just a few more passes…",
  "Combing through one last time…",
];

interface Props {
  chapterId: string;
  courseId: string;
  courseTitle: string;
  chapterPosition: number;
  title: string;
  completed: boolean;
  learningNote: string;
}

export default function LessonLoader({ chapterId, courseId, courseTitle, chapterPosition, title, completed, learningNote }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const lessonRef = useRef<LessonViewHandle>(null);

  useEffect(() => {
    setHtml(null);
    setError(null);

    fetch("/api/generate-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setHtml(data.html);
      })
      .catch(() => {
        setError("Failed to generate lesson");
      });
  }, [chapterId, fetchKey]);

  function handleRegenerate() {
    setFetchKey((k) => k + 1);
  }

  if (error) {
    return (
      <>
        {header}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <p className="text-red-600 font-medium">Failed to generate lesson</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
          </div>
        </div>
      </>
    );
  }

  const header = (
    <header className="border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
      <Link href={`/courses/${courseId}`} className="text-sm text-gray-500 hover:text-gray-800">
        ← {courseTitle}
      </Link>
      <span className="text-gray-300">|</span>
      <span className="text-sm font-medium flex-1">
        Ch. {chapterPosition}: {title}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => lessonRef.current?.print()}
          title="Print lesson"
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <IconPrint />
        </button>
        <button
          title="Share lesson"
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <IconShare />
        </button>
      </div>
    </header>
  );

  if (html !== null) {
    return (
      <>
        {header}
        <LessonView ref={lessonRef} html={html} chapterId={chapterId} title={title} />
        <LessonActions
          courseId={courseId}
          chapterId={chapterId}
          completed={completed}
          learningNote={learningNote}
          onRegenerate={handleRegenerate}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <LoadingScreen steps={LESSON_STEPS} title="Generating your lesson" />
    </>
  );
}

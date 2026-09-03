import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, mission")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, position, title, topic")
    .eq("course_id", courseId)
    .order("position");

  const { data: progress } = await supabase
    .from("user_progress")
    .select("chapter_id, completed")
    .eq("user_id", user.id)
    .in("chapter_id", (chapters ?? []).map((c) => c.id));

  const completedSet = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.chapter_id)
  );

  const completedCount = completedSet.size;
  const total = (chapters ?? []).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/courses" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
        ← All courses
      </Link>

      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-gray-500 mt-2 text-sm">{course.mission}</p>

      {total > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all"
              style={{ width: `${total ? (completedCount / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            {completedCount}/{total} complete
          </span>
        </div>
      )}

      <div className="mt-8 space-y-2">
        {chapters && chapters.length > 0 ? (
          chapters.map((chapter) => {
            const done = completedSet.has(chapter.id);
            return (
              <Link
                key={chapter.id}
                href={`/courses/${courseId}/${chapter.id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-black border-black text-white"
                      : "border-gray-300"
                  }`}
                >
                  {done && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div>
                  <span className="text-xs text-gray-400">Chapter {chapter.position}</span>
                  <div className="font-medium">{chapter.title}</div>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            No chapters yet.
          </p>
        )}
      </div>
    </div>
  );
}

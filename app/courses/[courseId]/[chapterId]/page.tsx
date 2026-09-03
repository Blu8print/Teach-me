import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import LessonLoader from "./LessonLoader";

interface Props {
  params: Promise<{ courseId: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { courseId, chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const [{ data: chapter }, { data: course }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, position, title, topic, course_id")
      .eq("id", chapterId)
      .single(),
    supabase
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .single(),
  ]);

  if (!chapter || !course) notFound();

  const { data: progress } = await supabase
    .from("user_progress")
    .select("completed, learning_note")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  return (
    <div className="min-h-screen flex flex-col">
      <LessonLoader
        chapterId={chapterId}
        courseId={courseId}
        courseTitle={course.title}
        chapterPosition={chapter.position}
        title={chapter.title}
        completed={progress?.completed ?? false}
        learningNote={progress?.learning_note ?? ""}
      />
    </div>
  );
}

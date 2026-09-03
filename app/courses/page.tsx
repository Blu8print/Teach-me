import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, mission, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <form action="/auth/sign-out" method="POST">
          <button
            formAction="/auth/sign-out"
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </form>
      </div>

      <Link
        href="/courses/new"
        className="block w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 text-center hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + New course
      </Link>

      <div className="mt-10 space-y-3">
        {courses && courses.length > 0 ? (
          courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
            >
              <div className="font-medium">{course.title}</div>
              <div className="text-sm text-gray-500 mt-1 line-clamp-2">{course.mission}</div>
            </Link>
          ))
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            No courses yet. Create your first one above.
          </p>
        )}
      </div>
    </div>
  );
}

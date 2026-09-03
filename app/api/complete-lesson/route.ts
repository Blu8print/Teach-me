import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId, completed, learningNote } = await request.json();
  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      completed: completed ?? true,
      learning_note: learningNote ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

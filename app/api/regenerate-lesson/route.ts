import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId, hint } = await request.json();
  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

  // Delete cached lesson
  await supabase
    .from("generated_lessons")
    .delete()
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId);

  // Fetch chapter + course context
  const { data: chapter } = await supabase
    .from("chapters")
    .select("title, topic, position, course_id")
    .eq("id", chapterId)
    .single();

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("title, mission")
    .eq("id", chapter.course_id)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Fetch prior learning notes
  const { data: allChapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("course_id", chapter.course_id);

  const chapterIds = (allChapters ?? []).map((c) => c.id);
  const { data: priorNotes } = await supabase
    .from("user_progress")
    .select("learning_note")
    .eq("user_id", user.id)
    .in("chapter_id", chapterIds)
    .not("learning_note", "is", null);

  const notesContext =
    (priorNotes ?? [])
      .map((n) => n.learning_note)
      .filter(Boolean)
      .join("\n- ") || null;

  const prompt = `You are an expert tutor. Generate a complete, self-contained HTML lesson page for a student.

Course: "${course.title}"
Student's goal: "${course.mission}"
Chapter ${chapter.position}: "${chapter.topic}"
${notesContext ? `\nPrior learning notes from the student:\n- ${notesContext}` : ""}
${hint ? `\nThe student wants this version to focus on: "${hint}"` : ""}

Requirements:
- Return ONLY a complete HTML document (<!DOCTYPE html> ... </html>). No markdown, no code fences.
- Inline all CSS (no external stylesheets or CDN links).
- No external JavaScript — only vanilla inline <script> tags if needed.
- The lesson should be educational, clear, and engaging.
- Include examples, explanations, and where appropriate a short quiz or exercise.
- Tailor the depth and examples to the student's stated goal.
- Use clean, readable typography with comfortable line-height and max-width for readability.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const rawHtml = completion.choices[0]?.message?.content ?? "";

  const htmlMatch = rawHtml.match(/```html\s*([\s\S]*?)```/i);
  const html = htmlMatch ? htmlMatch[1].trim() : rawHtml.trim();

  await supabase.from("generated_lessons").insert({
    user_id: user.id,
    chapter_id: chapterId,
    html_content: html,
  });

  return NextResponse.json({ html });
}

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

  const { chapterId } = await request.json();
  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

  // 1. Check cache
  const { data: cached } = await supabase
    .from("generated_lessons")
    .select("html_content")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ html: cached.html_content });
  }

  // 2. Fetch chapter + course context
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

  // 3. Fetch prior learning notes for this course
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

  // 4. Fetch course sources
  const { data: courseSources } = await supabase
    .from("course_sources")
    .select("label, summary")
    .eq("course_id", chapter.course_id);

  const sourcesContext =
    courseSources && courseSources.length > 0
      ? `\nThe following source material was provided by the student for this course. Ground your lesson in this content where relevant:\n\n${courseSources.map((s, i) => `Source ${i + 1} — ${s.label}:\n${s.summary}`).join("\n\n")}\n`
      : "";

  // 5. Build prompt
  const prompt = `You are an expert tutor. Generate a complete, self-contained HTML lesson page for a student.

Course: "${course.title}"
Student's goal: "${course.mission}"
Chapter ${chapter.position}: "${chapter.topic}"
${sourcesContext}${notesContext ? `\nPrior learning notes from the student:\n- ${notesContext}` : ""}

Requirements:
- Return ONLY a complete HTML document (<!DOCTYPE html> ... </html>). No markdown, no code fences.
- Inline all CSS (no external stylesheets or CDN links).
- No external JavaScript — only vanilla inline <script> tags if needed.
- The lesson should be educational, clear, and engaging.
- Include examples, explanations, and a short quiz with multiple-choice questions.
- Tailor the depth and examples to the student's stated goal.
- Use clean, readable typography with comfortable line-height and max-width for readability.

For every multiple-choice question, use EXACTLY this HTML pattern (copy the structure, change only the text and correct answer):

<div class="quiz-question" style="margin:1.5rem 0;padding:1.25rem;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;">
  <p style="font-weight:600;margin:0 0 1rem 0;">Q: What is the capital of France?</p>
  <form onsubmit="return false;">
    <label style="display:flex;align-items:center;gap:0.6rem;margin:0.4rem 0;cursor:pointer;">
      <input type="radio" name="q1" value="a"> Berlin
    </label>
    <label style="display:flex;align-items:center;gap:0.6rem;margin:0.4rem 0;cursor:pointer;">
      <input type="radio" name="q1" value="b"> Paris
    </label>
    <label style="display:flex;align-items:center;gap:0.6rem;margin:0.4rem 0;cursor:pointer;">
      <input type="radio" name="q1" value="c"> Madrid
    </label>
    <button type="button" onclick="(function(el){var f=el.closest('form');var sel=f.querySelector('input[type=radio]:checked');var fb=f.querySelector('.feedback');if(!sel){fb.textContent='Please select an answer.';fb.style.color='#6c757d';return;}fb.textContent=sel.value==='b'?'✓ Correct!':'✗ Incorrect — the answer is Paris.';fb.style.color=sel.value==='b'?'#198754':'#dc3545';})(this)"
      style="margin-top:0.75rem;padding:0.4rem 1.1rem;background:#212529;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;">
      Check answer
    </button>
    <p class="feedback" style="margin:0.5rem 0 0 0;font-size:0.9rem;min-height:1.2em;"></p>
  </form>
</div>

Rules for the quiz pattern:
- Each question gets a unique name attribute on its radio inputs (q1, q2, q3, …).
- The correct answer is the value of the radio input that should be selected (change 'b' in the onclick to the correct value).
- Never use external JS libraries. The entire onclick must be a self-contained inline function as shown.
- Do not deviate from this structure — keep the same CSS, element order, and class names.`;

  // 6. Call model via OpenRouter
  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const rawHtml = completion.choices[0]?.message?.content ?? "";

  // Extract HTML if Claude wrapped it in a code fence
  const htmlMatch = rawHtml.match(/```html\s*([\s\S]*?)```/i);
  const html = htmlMatch ? htmlMatch[1].trim() : rawHtml.trim();

  // 7. Store in cache
  await supabase.from("generated_lessons").insert({
    user_id: user.id,
    chapter_id: chapterId,
    html_content: html,
  });

  return NextResponse.json({ html });
}

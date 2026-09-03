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

  const { chapterId, messages, generateOpener } = await request.json();
  if (!chapterId) {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

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

  const systemPrompt = `You are a tutor helping a student with a specific lesson. Stay strictly on topic.

Course: "${course.title}"
Student's goal: "${course.mission}"
Lesson topic: "${chapter.topic}" (Chapter ${chapter.position})

Rules:
- Only answer questions related to this lesson topic.
- If the student asks about something unrelated, politely redirect them back to the lesson.
- Keep answers concise and educational.
- When the student demonstrates understanding, encourage them to go deeper.`;

  const chatMessages: { role: "user" | "assistant"; content: string }[] = generateOpener
    ? [
        {
          role: "user",
          content: `You are a teacher greeting a student who just read a lesson on "${chapter.topic}". Write a short, warm invitation to chat — not a question. Encourage them to share what they found interesting or what they'd like to explore further. Keep it to 1-2 sentences, natural and conversational. No preamble, just the invitation.`,
        },
      ]
    : (messages ?? []).slice(-6);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4-5",
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatMessages,
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}

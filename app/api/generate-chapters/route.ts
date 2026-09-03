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

  const { title, mission, sources } = await request.json();
  if (!title || !mission) {
    return NextResponse.json({ error: "Missing title or mission" }, { status: 400 });
  }

  const sourcesContext = Array.isArray(sources) && sources.length > 0
    ? `\nThe student has provided the following source material. Design the chapter outline to be grounded in this content:\n\n${sources.map((s: { label: string; summary: string }, i: number) => `Source ${i + 1} — ${s.label}:\n${s.summary}`).join("\n\n")}\n`
    : "";

  const prompt = `You are a curriculum designer. Generate a chapter outline for a self-paced online course.

Course title: "${title}"
Student's goal: "${mission}"${sourcesContext}

Return a JSON array of 6–10 chapters. Each chapter must have:
- "title": a short chapter title (max 8 words)
- "topic": a one-sentence description of what the chapter covers

Respond with ONLY the JSON array, no explanation, no markdown fences.
Example: [{"title":"Introduction","topic":"Overview of the subject and what we will cover."},...]`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";

  // Strip markdown fences if present
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let chapters: { title: string; topic: string }[];
  try {
    chapters = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Failed to parse chapter list from AI response" }, { status: 500 });
  }

  return NextResponse.json({ chapters });
}

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const CHAR_LIMIT = 50_000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const truncated = text.slice(0, CHAR_LIMIT);

  const prompt = `Analyse the following source material and produce a structured extract that will help a tutor design a course and generate lessons grounded in this content.

Return ONLY a JSON object with these fields:
- "topics": string[] — main topics or sections covered (max 10)
- "key_concepts": string[] — important terms, concepts, or ideas (max 15)
- "examples": string[] — notable examples, case studies, or illustrations mentioned (max 5)
- "core_argument": string — the central thesis or main point in 1–2 sentences
- "scope": string — what the material does and does not cover in 1 sentence

Source material:
---
${truncated}
---

Respond with ONLY the JSON object, no markdown fences.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let summary: object;
  try {
    summary = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Failed to parse summary from AI response" }, { status: 500 });
  }

  return NextResponse.json({ summary });
}

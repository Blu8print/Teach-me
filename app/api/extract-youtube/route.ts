import { createClient } from "@/lib/supabase/server";
import { YoutubeTranscript } from "youtube-transcript";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    const text = transcript.map((t) => t.text).join(" ");
    if (!text.trim()) {
      return NextResponse.json({ error: "No transcript available for this video" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Could not fetch transcript. The video may not have captions." }, { status: 422 });
  }
}

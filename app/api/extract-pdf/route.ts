import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    const text = result.text.trim();

    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted. The PDF may be scanned or image-based." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 422 });
  }
}

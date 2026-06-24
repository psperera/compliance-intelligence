// POST /api/extract — extract plain text from an uploaded document for the Compare tool.
// Supports: .txt/.md/.html/.xml (utf8), .docx (mammoth), .pdf (pdf-parse).
// Runs on the Node runtime (these libraries need Node APIs).
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const TEXT_EXT = ["txt", "md", "markdown", "html", "htm", "xml", "csv"];

function stripHtml(s: string): string {
  return s.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").trim();
}

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "expected a file upload" }, { status: 400 }); }
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "no file provided" }, { status: 400 });

  const name = (file as File).name || "upload";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const buf = Buffer.from(await (file as File).arrayBuffer());

  try {
    if (TEXT_EXT.includes(ext)) {
      const raw = buf.toString("utf8");
      return NextResponse.json({ text: ext === "html" || ext === "htm" ? stripHtml(raw) : raw, source: ext });
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return NextResponse.json({ text: value, source: "docx" });
    }
    if (ext === "pdf") {
      const pdfParse = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text: string }>;
      const { text } = await pdfParse(buf);
      return NextResponse.json({ text, source: "pdf" });
    }
    if (ext === "doc") {
      return NextResponse.json({ error: "Legacy .doc isn't supported — save as .docx or PDF and retry." }, { status: 415 });
    }
    // fallback: try utf8
    return NextResponse.json({ text: buf.toString("utf8"), source: "raw" });
  } catch (e) {
    return NextResponse.json({ error: `Could not extract text: ${(e as Error).message}` }, { status: 422 });
  }
}

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const filename = url.searchParams.get("filename");
    if (!id || !filename) return NextResponse.json({ message: "invalid params" }, { status: 400 });
    const buf = Buffer.from(await req.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${id}-${filename}`);
    await fs.writeFile(filePath, buf);
    return NextResponse.json({ ok: true, fileUrl: `/uploads/${id}-${filename}` });
  } catch (e) {
    return NextResponse.json({ message: "upload failed" }, { status: 500 });
  }
}


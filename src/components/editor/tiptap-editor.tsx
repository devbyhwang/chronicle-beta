"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";

type Props = {
  value?: string;
  onChange?: (html: string) => void;
};

function isYouTubeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.host.includes("youtube.com") || u.host.includes("youtu.be");
  } catch {
    return false;
  }
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

async function signUpload(filename: string, contentType?: string) {
  const res = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });
  if (!res.ok) throw new Error("sign failed");
  return (await res.json()) as { uploadUrl: string; fileUrl: string };
}

export default function TiptapEditor({ value, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [overlay, setOverlay] = useState<{ x: number; y: number } | null>(null);
  const resizingRef = useRef<{ el: HTMLImageElement | HTMLVideoElement; startX: number; startW: number } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ 
        horizontalRule: {}, 
        dropcursor: { color: "var(--ring)" },
        link: false, // Disable StarterKit's link to use our custom one
        underline: false // Disable StarterKit's underline to use our custom one
      }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ allowBase64: false }),
      Youtube.configure({ nocookie: false, controls: true, allowFullscreen: true, inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "내용을 입력하세요. 링크/유튜브는 붙여넣기 즉시 처리됩니다." }),
    ],
    content: value || "",
    editorProps: {
      handlePaste: (view, event, _slice) => {
        try {
          const dt = event.clipboardData;
          if (!dt) return false;
          // Files paste
          const files = Array.from(dt.files || []);
          if (files.length > 0) {
            setIsUploading(true);
            (async () => {
              try {
                for (const f of files) {
                  const { uploadUrl, fileUrl } = await signUpload(f.name, f.type);
                  await fetch(uploadUrl, { method: "PUT", body: f });
                  if (isImageFile(f)) editor?.chain().focus().setImage({ src: fileUrl, alt: f.name }).run();
                  else if (isVideoFile(f)) editor?.chain().focus().insertContent(`<video src=\"${fileUrl}\" controls class=\"w-full rounded-md\"></video>`).run();
                  else editor?.chain().focus().insertContent(`<a href=\"${fileUrl}\">${f.name}</a>`).run();
                }
              } finally {
                setIsUploading(false);
              }
            })();
            return true;
          }
          // Text paste
          const text = dt.getData("text/plain").trim();
          if (text && isYouTubeUrl(text)) {
            editor?.chain().focus().setYoutubeVideo({ src: text, width: 640, height: 360 }).run();
            return true;
          }
        } catch {
          setIsUploading(false);
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length === 0) return false;
        event.preventDefault();
        setIsUploading(true);
        (async () => {
          try {
            for (const f of files) {
              const { uploadUrl, fileUrl } = await signUpload(f.name, f.type);
              await fetch(uploadUrl, { method: "PUT", body: f });
              if (isImageFile(f)) editor?.chain().focus().setImage({ src: fileUrl, alt: f.name }).run();
              else if (isVideoFile(f)) editor?.chain().focus().insertContent(`<video src=\"${fileUrl}\" controls class=\"w-full rounded-md\"></video>`).run();
              else editor?.chain().focus().insertContent(`<a href=\"${fileUrl}\">${f.name}</a>`).run();
            }
          } finally {
            setIsUploading(false);
          }
        })();
        return true;
      },
      attributes: { class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-64" },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Track clicked media and show resize handle
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === 'IMG' || t.tagName === 'VIDEO') {
        const el = t as HTMLImageElement | HTMLVideoElement;
        setSelectedEl(el);
        const rect = el.getBoundingClientRect();
        setOverlay({ x: rect.right + window.scrollX - 6, y: rect.bottom + window.scrollY - 6 });
      } else {
        setSelectedEl(null);
        setOverlay(null);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!selectedEl) return;
      const rect = selectedEl.getBoundingClientRect();
      setOverlay({ x: rect.right + window.scrollX - 6, y: rect.bottom + window.scrollY - 6 });
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    const handle = document.getElementById('ce-resize-handle');
    if (!handle) return;
    let dragging = false;
    let startX = 0;
    let startW = 0;
    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startW = selectedEl.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const next = Math.max(80, startW + delta);
      (selectedEl as any).style.width = `${next}px`;
      const rect = selectedEl.getBoundingClientRect();
      setOverlay({ x: rect.right + window.scrollX - 6, y: rect.bottom + window.scrollY - 6 });
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onDown as any);
    return () => handle.removeEventListener('mousedown', onDown as any);
  }, [selectedEl, overlay]);

  // Resize by dragging media border (near right/bottom edge)
  useEffect(() => {
    function nearRightOrBottom(el: HTMLElement, ev: MouseEvent, threshold = 8) {
      const r = el.getBoundingClientRect();
      const nearRight = Math.abs(ev.clientX - r.right) <= threshold && ev.clientY >= r.top && ev.clientY <= r.bottom;
      const nearBottom = Math.abs(ev.clientY - r.bottom) <= threshold && ev.clientX >= r.left && ev.clientX <= r.right;
      return nearRight || nearBottom;
    }
    const onMove = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if ((t.tagName === 'IMG' || t.tagName === 'VIDEO')) {
        (t as HTMLElement).style.cursor = nearRightOrBottom(t, e) ? 'nwse-resize' : '';
      }
      // live resize
      const s = resizingRef.current;
      if (s) {
        const delta = e.clientX - s.startX;
        const next = Math.max(80, s.startW + delta);
        (s.el as any).style.width = `${next}px`;
        const rect = s.el.getBoundingClientRect();
        setOverlay({ x: rect.right + window.scrollX - 6, y: rect.bottom + window.scrollY - 6 });
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if ((t.tagName === 'IMG' || t.tagName === 'VIDEO') && nearRightOrBottom(t, e)) {
        e.preventDefault();
        const el = t as HTMLImageElement | HTMLVideoElement;
        resizingRef.current = { el, startX: e.clientX, startW: el.getBoundingClientRect().width };
        document.addEventListener('mouseup', onUp, true);
      }
    };
    const onUp = () => { resizingRef.current = null; };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('mouseup', onUp, true);
    };
  }, []);

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요", previousUrl || "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="border rounded-md" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-background text-xs">
        {/* Basic text style */}
        <button className={`px-2 py-1 rounded border ${editor?.isActive('bold') ? 'bg-accent border-accent' : 'border-border hover:bg-accent'}`} onClick={() => editor?.chain().focus().toggleBold().run()} aria-pressed={editor?.isActive('bold')} aria-label="굵게">굵게</button>
        <button className={`px-2 py-1 rounded border ${editor?.isActive('italic') ? 'bg-accent border-accent' : 'border-border hover:bg-accent'}`} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-pressed={editor?.isActive('italic')} aria-label="기울임">기울임</button>
        <button className={`px-2 py-1 rounded border ${editor?.isActive('underline') ? 'bg-accent border-accent' : 'border-border hover:bg-accent'}`} onClick={() => editor?.chain().focus().toggleUnderline().run()} aria-pressed={editor?.isActive('underline')} aria-label="밑줄">밑줄</button>
        <button className={`px-2 py-1 rounded border ${editor?.isActive('strike') ? 'bg-accent border-accent' : 'border-border hover:bg-accent'}`} onClick={() => editor?.chain().focus().toggleStrike().run()} aria-pressed={editor?.isActive('strike')} aria-label="취소선">취소선</button>
        <span className="mx-1 opacity-60">|</span>
        {/* Font style/size */}
        <select className="h-8 rounded border border-border bg-background px-2" aria-label="텍스트 스타일" onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') editor?.chain().focus().setParagraph().run();
          if (v === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
          if (v === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run();
        }} value={editor?.isActive('heading', { level: 3 }) ? 'h3' : editor?.isActive('heading', { level: 2 }) ? 'h2' : 'p'}>
          <option value="p">본문</option>
          <option value="h2">제목 2</option>
          <option value="h3">제목 3</option>
        </select>
        <select className="h-8 rounded border border-border bg-background px-2" aria-label="글자 크기" onChange={(e) => {
          const px = e.target.value;
          editor?.chain().focus().setMark('textStyle', { fontSize: `${px}px` }).run();
        }} defaultValue="16">
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
        </select>
        <span className="mx-1 opacity-60">|</span>
        {/* Text color */}
        <label className="inline-flex items-center gap-2 text-xs">
          <span className="opacity-70">글자 색상</span>
          <input type="color" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
        </label>
        {/* Background color */}
        <label className="inline-flex items-center gap-2 text-xs">
          <span className="opacity-70">배경</span>
          <input type="color" onChange={(e) => editor?.chain().focus().setMark('textStyle', { backgroundColor: e.target.value }).run()} />
        </label>
        <span className="mx-1 opacity-60">|</span>
        {/* Indent/Outdent */}
        <button className="px-2 py-1 rounded border border-border hover:bg-accent" onClick={() => editor?.chain().focus().sinkListItem('listItem').run()} aria-label="들여쓰기">들여쓰기</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-accent" onClick={() => editor?.chain().focus().liftListItem('listItem').run()} aria-label="내어쓰기">내어쓰기</button>
        <span className="mx-1 opacity-60">|</span>
        <select className="h-8 rounded border border-border bg-background px-2" aria-label="정렬" onChange={(e) => {
          const v = e.target.value as 'left' | 'center' | 'right' | 'justify';
          editor?.chain().focus().setTextAlign(v).run();
        }} value={editor?.getAttributes('paragraph')?.textAlign || 'left'}>
          <option value="left">왼쪽 정렬</option>
          <option value="center">가운데 정렬</option>
          <option value="right">오른쪽 정렬</option>
          <option value="justify">양쪽 맞춤</option>
        </select>
        <span className="mx-1 opacity-60">|</span>
        <button className="px-2 py-1 rounded border border-border hover:bg-accent" title="링크" onClick={toggleLink} aria-pressed={editor?.isActive('link')}>링크</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-accent" title="구분선" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>구분선</button>
        <span className="mx-1 opacity-60">|</span>
        <label className="px-2 py-1 rounded border border-border hover:bg-accent cursor-pointer">
          이미지/파일
          <input type="file" multiple className="hidden" onChange={async (e) => {
            const files = Array.from(e.currentTarget.files || []);
            if (files.length === 0) return;
            setIsUploading(true);
            try {
              for (const f of files) {
                const { uploadUrl, fileUrl } = await signUpload(f.name, f.type);
                await fetch(uploadUrl, { method: 'PUT', body: f });
                if (isImageFile(f)) editor?.chain().focus().setImage({ src: fileUrl, alt: f.name }).run();
                else if (isVideoFile(f)) editor?.chain().focus().insertContent(`<video src=\"${fileUrl}\" controls class=\"w-full rounded-md\"></video>`).run();
                else editor?.chain().focus().insertContent(`<a href=\"${fileUrl}\">${f.name}</a>`).run();
              }
            } finally {
              setIsUploading(false);
              e.currentTarget.value = "";
            }
          }} />
        </label>
        <button className="px-2 py-1 rounded border border-border hover:bg-accent" title="YouTube 삽입" onClick={() => {
          const url = window.prompt('YouTube URL');
          if (url && isYouTubeUrl(url)) editor?.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
        }}>영상</button>
        <span className="ml-auto text-muted-foreground">{isUploading ? "업로드 중…" : ""}</span>
      </div>
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
      {selectedEl && overlay && (
        <div className="ce-resize-overlay fixed" style={{ left: overlay.x, top: overlay.y }}>
          <div id="ce-resize-handle" className="ce-resize-handle" />
        </div>
      )}
    </div>
  );
}

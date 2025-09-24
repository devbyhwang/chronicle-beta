"use client";

import { useMemo, MouseEvent } from "react";

function isUrl(text: string) {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.host.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.host.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

function isImageUrl(url: string) {
  return /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(url);
}

function isVideoUrl(url: string) {
  return /(\.mp4|\.webm|\.ogg)$/i.test(url);
}

function renderHTMLToReact(html: string, onLinkClick: (e: MouseEvent<HTMLAnchorElement>) => void) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const allowed = new Set(["DIV","P","BR","SPAN","STRONG","B","EM","I","CODE","PRE","UL","OL","LI","BLOCKQUOTE","A","IMG","VIDEO","IFRAME"]);

    function walk(node: Node, key: number | string): any {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const el = node as HTMLElement;
      if (!allowed.has(el.tagName)) return Array.from(el.childNodes).map((n, i) => walk(n, `${key}-${i}`));
      const children = Array.from(el.childNodes).map((n, i) => walk(n, `${key}-${i}`));
      switch (el.tagName) {
        case "A": {
          const href = (el as HTMLAnchorElement).href;
          return <a key={String(key)} href={href} onClick={onLinkClick} className="underline break-all">{children}</a>;
        }
        case "IMG": {
          const src = (el as HTMLImageElement).src;
          if (!/^https?:\/\//.test(src) && !src.startsWith("/")) return null;
          return <img key={String(key)} src={src} alt={el.getAttribute("alt") || "image"} className="max-w-full rounded-md"/>;
        }
        case "VIDEO": {
          const src = el.getAttribute("src") || "";
          return <video key={String(key)} src={src} controls className="w-full rounded-md"/>;
        }
        case "IFRAME": {
          const src = el.getAttribute("src") || "";
          try {
            const u = new URL(src);
            if (!u.host.includes("youtube.com") && !u.host.includes("youtu.be")) return null;
          } catch { return null; }
          return <iframe key={String(key)} className="w-full h-64 rounded-md" src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />;
        }
        case "UL": return <ul key={String(key)} className="list-disc pl-5">{children}</ul>;
        case "OL": return <ol key={String(key)} className="list-decimal pl-5">{children}</ol>;
        case "LI": return <li key={String(key)}>{children}</li>;
        case "PRE": return <pre key={String(key)} className="bg-muted rounded p-2 overflow-x-auto text-xs">{children}</pre>;
        case "CODE": return <code key={String(key)} className="bg-muted rounded px-1">{children}</code>;
        case "BLOCKQUOTE": return <blockquote key={String(key)} className="border-l-2 pl-3 text-muted-foreground">{children}</blockquote>;
        case "STRONG":
        case "B": return <strong key={String(key)}>{children}</strong>;
        case "EM":
        case "I": return <em key={String(key)}>{children}</em>;
        case "BR": return <br key={String(key)} />;
        case "DIV":
        case "SPAN":
        case "P": default:
          return <p key={String(key)} className="whitespace-pre-wrap text-sm leading-6">{children}</p>;
      }
    }
    return Array.from(doc.body.childNodes).map((n, i) => walk(n, i));
  } catch {
    return null;
  }
}

export function ContentRenderer({ content }: { content: string }) {
  const isLikelyHTML = /<\w+[\s\S]*>/m.test(content);
  const blocks = useMemo(() => isLikelyHTML ? [] : content.split(/\n\n+/), [content, isLikelyHTML]);

  function onLinkClick(e: MouseEvent<HTMLAnchorElement>) {
    const href = (e.currentTarget as HTMLAnchorElement).href;
    const ok = window.confirm("해당 사이트로 이동하시겠습니까?");
    if (!ok) {
      e.preventDefault();
      return;
    }
  }

  return (
    <div className="space-y-3">
      {isLikelyHTML && renderHTMLToReact(content, onLinkClick)}
      {!isLikelyHTML && blocks.map((b, i) => {
        const trimmed = b.trim();
        // YouTube embed if the block is just a YT URL
        if (isUrl(trimmed)) {
          const yt = extractYouTubeId(trimmed);
          if (yt) {
            const src = `https://www.youtube.com/embed/${yt}`;
            return (
              <div key={i} className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded-md"
                  src={src}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            );
          }
          if (isImageUrl(trimmed)) {
            return <img key={i} src={trimmed} alt="image" className="max-w-full rounded-md" />;
          }
          if (isVideoUrl(trimmed)) {
            return (
              <video key={i} src={trimmed} controls className="w-full rounded-md" />
            );
          }
        }

        // Inline linkify for general text
        const parts = trimmed.split(/(https?:\/\/[^\s)]+)/g);
        return (
          <p key={i} className="whitespace-pre-wrap text-sm leading-6">
            {parts.map((part, j) => {
              if (isUrl(part)) {
                return (
                  <a key={j} href={part} onClick={onLinkClick} className="underline break-all">
                    {part}
                  </a>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

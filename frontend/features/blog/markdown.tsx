import Link from "next/link";
import type { ReactNode } from "react";

export type BlogTocItem = {
  id: string;
  label: string;
};

export type BlogMeta = {
  title: string;
  description: string;
  toc: BlogTocItem[];
};

type InlineNode = ReactNode;

type ParagraphBlock = { type: "p"; text: string };

type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; id: string; text: string }
  | ParagraphBlock
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function isParagraph(block: Block): block is ParagraphBlock {
  return block.type === "p";
}

function isH2(block: Block): block is Extract<Block, { type: "h2" }> {
  return block.type === "h2";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function renderInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (link) {
        const href = link[2];
        const label = link[1];
        if (href.startsWith("/")) {
          nodes.push(
            <Link key={key++} href={href}>
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>,
          );
        }
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\||\|$/g, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function parseBlocks(markdown: string): { title: string; blocks: Block[] } {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let title = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed === "---") {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang, code: body.join("\n") });
      continue;
    }

    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      title = stripInline(trimmed.slice(2));
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = stripInline(trimmed.slice(3));
      blocks.push({ type: "h2", id: slugify(text), text });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const text = stripInline(trimmed.slice(4));
      blocks.push({ type: "h3", id: slugify(text), text });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraph: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        next === "---" ||
        next.startsWith("#") ||
        next.startsWith("```") ||
        next.startsWith("|") ||
        /^\d+\.\s+/.test(next) ||
        /^[-*]\s+/.test(next)
      ) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    blocks.push({ type: "p", text: paragraph.join(" ") });
  }

  return { title, blocks };
}

export function extractBlogMeta(markdown: string): BlogMeta {
  const { title, blocks } = parseBlocks(markdown);
  const paragraphs = blocks.filter(isParagraph);
  const descriptive =
    paragraphs.find((block) => block.text.startsWith("Svigl is a real-time"))?.text ??
    paragraphs.find((block) => block.text.length >= 180)?.text ??
    paragraphs[0]?.text ??
    "";

  return {
    title: title || "Svigl Blog",
    description: descriptive,
    toc: blocks.filter(isH2).map((block) => ({ id: block.id, label: block.text })),
  };
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          id={block.id}
          className="scroll-mt-24 border-b border-plum/10 pb-3 font-display text-xl tracking-tight text-ink sm:text-2xl"
        >
          {renderInline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          id={block.id}
          className="scroll-mt-24 font-display text-[1.05rem] tracking-tight text-ink sm:text-xl"
        >
          {renderInline(block.text)}
        </h3>
      );
    case "p":
      return <p>{renderInline(block.text)}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre>
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return (
        <div className="blog-table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${cell}`}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export function MarkdownContent({
  markdown,
  skipParagraph,
}: {
  markdown: string;
  skipParagraph?: string;
}) {
  const { blocks } = parseBlocks(markdown);
  const visible = skipParagraph
    ? blocks.filter((block) => !(block.type === "p" && block.text === skipParagraph))
    : blocks;
  const sections: Block[][] = [];
  let current: Block[] = [];

  for (const block of visible) {
    if (block.type === "h2" && current.length > 0) {
      sections.push(current);
      current = [block];
    } else {
      current.push(block);
    }
  }
  if (current.length > 0) {
    sections.push(current);
  }

  return (
    <>
      {sections.map((section, index) => {
        const heading = section[0]?.type === "h2" ? section[0] : null;
        return (
          <section
            key={heading?.id ?? `intro-${index}`}
            aria-labelledby={heading?.id}
            className="space-y-4"
          >
            {section.map((block, blockIndex) => (
              <BlockView key={`${block.type}-${blockIndex}`} block={block} />
            ))}
          </section>
        );
      })}
    </>
  );
}

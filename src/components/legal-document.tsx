import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/ui";
import { loadPublicLegalDocument } from "@/lib/legal/loader";
import type { PublicLegalDocumentId } from "@/lib/legal/routes";

function safeMarkdownUrl(value: string): string {
  if ((value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")) {
    return value;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "mailto:" ? value : "";
  } catch {
    return "";
  }
}

const LEGAL_MARKDOWN_COMPONENTS: Components = {
  a: ({ children, href }) => {
    const external = href?.startsWith("https://") ?? false;
    return (
      <a
        className="font-semibold text-accent underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
        href={href}
        rel={external ? "noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-hairline-strong pl-5 text-ink-secondary">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.9em] text-ink">
      {children}
    </code>
  ),
  h1: ({ children }) => (
    <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 text-2xl font-semibold tracking-tight text-ink">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 text-xl font-semibold text-ink">{children}</h3>
  ),
  hr: () => <hr className="my-10 border-hairline" />,
  img: () => null,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6">{children}</ol>,
  p: ({ children }) => <p className="my-5 leading-7 text-ink-secondary">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  td: ({ children }) => (
    <td className="border-b border-hairline px-3 py-3 align-top text-ink-secondary">{children}</td>
  ),
  th: ({ children }) => (
    <th className="border-b border-hairline-strong px-3 py-3 align-bottom font-semibold text-ink">
      {children}
    </th>
  ),
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6">{children}</ul>,
};

export async function legalDocumentMetadata(
  documentId: PublicLegalDocumentId,
): Promise<Metadata> {
  const document = await loadPublicLegalDocument(documentId);
  if (!document) {
    return { robots: { follow: false, index: false } };
  }
  return {
    alternates: { canonical: document.metadata.url ?? undefined },
    title: document.metadata.title,
  };
}

export async function LegalDocumentPage({
  documentId,
}: {
  documentId: PublicLegalDocumentId;
}) {
  const document = await loadPublicLegalDocument(documentId);
  if (!document) notFound();

  return (
    <Section className="py-16 sm:py-24">
      <article className="mx-auto max-w-3xl text-[15px]">
        <ReactMarkdown
          components={LEGAL_MARKDOWN_COMPONENTS}
          remarkPlugins={[remarkGfm]}
          skipHtml
          urlTransform={safeMarkdownUrl}
        >
          {document.markdown}
        </ReactMarkdown>
      </article>
    </Section>
  );
}

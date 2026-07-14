'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PROJECT_DOCS, PROJECT_DOCS_META } from '@/lib/project-docs';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/github-dark.css';

export default function DocsPage() {
  const [activeId, setActiveId] = useState(PROJECT_DOCS[0]?.id ?? 'overview');
  const activeSection = PROJECT_DOCS.find((s) => s.id === activeId) ?? PROJECT_DOCS[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-8">
        <div className="container mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI Blueprint</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Project Documentation</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">Domain:</strong> {PROJECT_DOCS_META.domain}</span>
          </div>
          <p className="mt-4 max-w-3xl rounded-lg bg-secondary/50 p-4 text-sm italic text-muted-foreground">
            &ldquo;{PROJECT_DOCS_META.prompt}&rdquo;
          </p>
        </div>
      </header>

      <div className="container mx-auto flex max-w-6xl gap-0 px-4 py-8 lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {PROJECT_DOCS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  activeId === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-4 lg:hidden">
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {PROJECT_DOCS.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
              ))}
            </select>
          </div>

          <article className="prose prose-stone max-w-none rounded-xl border bg-card p-6 shadow-card dark:prose-invert lg:p-10">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {activeSection.content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}

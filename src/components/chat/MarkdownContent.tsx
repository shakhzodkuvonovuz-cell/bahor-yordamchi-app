import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Custom components for ReactMarkdown with premium styling
const markdownComponents: Components = {
  // Headings - slightly brighter and bolder
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">{children}</h4>
  ),
  
  // Paragraphs
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  
  // Bold and italic
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  
  // Links - open in new tab with safe attributes
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors break-all"
    >
      {children}
    </a>
  ),
  
  // Lists with proper spacing and indentation
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-1">{children}</li>
  ),
  
  // Code blocks with subtle background
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-secondary/80 text-[13px] font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    
    // Block code
    return (
      <code className="font-mono text-[13px]" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mt-3 mb-3 rounded-xl bg-secondary/80 text-foreground text-[13px] p-4 overflow-x-auto max-w-full">
      {children}
    </pre>
  ),
  
  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-primary/40 pl-4 py-1 my-3 italic text-muted-foreground bg-secondary/30 rounded-r-lg">
      {children}
    </blockquote>
  ),
  
  // Horizontal rule
  hr: () => (
    <hr className="my-4 border-border/50" />
  ),
  
  // Tables (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-secondary/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-border/30">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2">{children}</td>
  ),
};

function MarkdownContentComponent({ content, className = "" }: MarkdownContentProps) {
  // Memoize the processed content to avoid re-parsing on every render
  const processedContent = useMemo(() => content, [content]);

  return (
    <div 
      className={`
        text-[15px] leading-7 tracking-[0.01em]
        [overflow-wrap:anywhere] [word-break:break-word]
        ${className}
      `}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Memoize to prevent re-renders when content hasn't changed
const MarkdownContent = memo(MarkdownContentComponent, (prev, next) => {
  return prev.content === next.content && prev.className === next.className;
});

export default MarkdownContent;

import { memo, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";
import { Check, Copy } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Code block with copy button
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [children]);
  
  // Extract language from className (e.g., "language-javascript")
  const language = className?.replace("language-", "") || "";
  
  return (
    <div className="relative group/code my-3">
      {/* Language label + Copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/90 border-b border-border/30 rounded-t-xl">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="rounded-t-none rounded-b-xl bg-secondary/70 text-foreground text-[13px] p-4 overflow-x-auto max-w-full">
        <code className={`font-mono ${className || ""}`}>{children}</code>
      </pre>
    </div>
  );
}

// Custom components for ReactMarkdown with premium styling
const markdownComponents: Components = {
  // Headings - ChatGPT-like with good spacing
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0 pb-2 border-b border-border/30">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-foreground mt-5 mb-2.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-medium text-muted-foreground mt-2 mb-1 first:mt-0">{children}</h6>
  ),
  
  // Paragraphs with proper rhythm
  p: ({ children }) => (
    <p className="mb-4 last:mb-0 leading-7">{children}</p>
  ),
  
  // Bold and italic - enhanced
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/90">{children}</em>
  ),
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),
  
  // Links - safe, styled, and clearly tappable
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors break-words"
    >
      {children}
    </a>
  ),
  
  // Lists with proper spacing and indentation
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 last:mb-0 space-y-2 marker:text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 last:mb-0 space-y-2 marker:text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7 pl-1.5">{children}</li>
  ),
  
  // Task lists (GFM)
  input: ({ checked, disabled, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      className="mr-2 rounded border-border accent-primary"
      {...props}
    />
  ),
  
  // Code - differentiate inline vs block
  code: ({ className, children, ...props }) => {
    // Check if this is inside a pre (block code) or standalone (inline)
    const isInline = !className;
    
    if (isInline) {
      return (
        <code 
          className="px-1.5 py-0.5 rounded-md bg-secondary/80 text-[13px] font-mono text-foreground border border-border/20" 
          {...props}
        >
          {children}
        </code>
      );
    }
    
    // Block code - will be wrapped in CodeBlock via pre
    return (
      <code className={`font-mono text-[13px] ${className || ""}`} {...props}>
        {children}
      </code>
    );
  },
  
  // Pre - wrapper for code blocks with copy button
  pre: ({ children }) => {
    // Extract code element and its props
    const codeElement = children as React.ReactElement;
    if (codeElement?.props?.children) {
      return (
        <CodeBlock className={codeElement.props.className}>
          {codeElement.props.children}
        </CodeBlock>
      );
    }
    return (
      <pre className="my-3 rounded-xl bg-secondary/70 text-foreground text-[13px] p-4 overflow-x-auto max-w-full font-mono">
        {children}
      </pre>
    );
  },
  
  // Blockquotes - premium styling
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-secondary/20 rounded-r-lg text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  
  // Horizontal rule
  hr: () => (
    <hr className="my-6 border-border/40" />
  ),
  
  // Tables (GFM) - premium with horizontal scroll on mobile
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-border/40">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-secondary/60 border-b border-border/40">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/20">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-secondary/20 hover:bg-secondary/30 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-foreground">{children}</td>
  ),
  
  // Images
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ""}
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
    />
  ),
};

function MarkdownContentComponent({ content, className = "" }: MarkdownContentProps) {
  // Memoize the processed content
  const processedContent = useMemo(() => content, [content]);

  return (
    <div 
      className={`
        text-[15px] md:text-base leading-7 tracking-[0.01em]
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

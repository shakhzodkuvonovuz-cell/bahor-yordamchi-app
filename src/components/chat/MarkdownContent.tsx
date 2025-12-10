import { memo, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Code block with syntax highlighting and copy button
function CodeBlock({ children, language }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [children]);
  
  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-border/30">
      {/* Language label + Copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] border-b border-border/20">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "13px",
          borderRadius: 0,
          background: "#1e1e1e",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }
        }}
      >
        {children}
      </SyntaxHighlighter>
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
    const match = /language-(\w+)/.exec(className || "");
    const isBlock = match || (typeof children === "string" && children.includes("\n"));
    
    if (isBlock) {
      // Will be handled by pre wrapper
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    
    // Inline code
    return (
      <code 
        className="px-1.5 py-0.5 rounded-md bg-secondary/80 text-[13px] font-mono text-foreground border border-border/20" 
        {...props}
      >
        {children}
      </code>
    );
  },
  
  // Pre - wrapper for code blocks with syntax highlighting
  pre: ({ children }) => {
    const codeElement = children as React.ReactElement;
    if (codeElement?.props) {
      const { className, children: codeChildren } = codeElement.props;
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const codeString = String(codeChildren).replace(/\n$/, "");
      
      return <CodeBlock language={language}>{codeString}</CodeBlock>;
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

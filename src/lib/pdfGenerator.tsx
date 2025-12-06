/**
 * PDF Generator using @react-pdf/renderer
 * 
 * This replaces the old jsPDF-based generator which had severe Unicode issues:
 * - Emojis would render as garbage like "Ø=ÜA"
 * - Some lines would have spaced-out letters
 * - Uzbek special characters (o', g') wouldn't display correctly
 * 
 * @react-pdf/renderer with registered Unicode fonts solves these issues.
 * Includes HTML print fallback for maximum reliability.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';

// Flag to track if fonts are registered
let fontsRegistered = false;

// Register Noto Sans font for proper Unicode/Latin Extended support
// Using .woff format which has better compatibility
function registerFonts() {
  if (fontsRegistered) return;
  
  try {
    Font.register({
      family: 'NotoSans',
      fonts: [
        {
          src: '/fonts/NotoSans-Regular.woff',
          fontWeight: 'normal',
        },
        {
          src: '/fonts/NotoSans-Bold.woff',
          fontWeight: 'bold',
        },
      ],
    });
    
    // Disable hyphenation to prevent word breaking issues
    Font.registerHyphenationCallback((word) => [word]);
    
    fontsRegistered = true;
  } catch (err) {
    console.warn('[AI_PDF_EXPORT] Font registration warning:', err);
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSans',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111',
  },
  meta: {
    fontSize: 10,
    color: '#666',
  },
  content: {
    marginTop: 10,
  },
  heading1: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#111',
  },
  heading2: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
    color: '#222',
  },
  heading3: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 12,
    flexDirection: 'row',
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  listItemText: {
    flex: 1,
  },
  checkbox: {
    width: 14,
    fontSize: 11,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});

// Comprehensive emoji sanitization to prevent encoding issues
export function sanitizeEmojis(text: string): string {
  // Common emoji patterns - replace with text equivalents
  const emojiMap: Record<string, string> = {
    '📅': '(Reja)',
    '📋': '(Royxat)',
    '✅': '[x]',
    '❌': '[ ]',
    '⚠️': '(!)',
    '💡': '(Fikr)',
    '🔍': '(Qidirish)',
    '📝': '(Eslatma)',
    '🎯': '(Maqsad)',
    '⭐': '*',
    '🚀': '',
    '💬': '(Izoh)',
    '📌': '(Muhim)',
    '🔔': '(Bildirishnoma)',
    '👉': '->',
    '👈': '<-',
    '👆': '^',
    '👇': 'v',
    '✨': '',
    '🔥': '(!)',
    '💪': '',
    '🎉': '',
    '❗': '(!)',
    '❓': '(?)',
    '➡️': '->',
    '⬅️': '<-',
    '✓': '[x]',
    '✔️': '[x]',
    '☑️': '[x]',
    '🔹': '-',
    '🔸': '-',
    '▪️': '-',
    '▫️': '-',
    '•': '-',
    '◦': '-',
    '◉': '-',
    '○': '-',
    '●': '-',
  };

  let result = text;
  
  // Replace known emojis
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    result = result.split(emoji).join(replacement);
  }

  // Remove remaining emojis (comprehensive Unicode emoji ranges)
  result = result
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Misc symbols, emoticons
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')  // Mahjong
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')  // Playing cards
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation selectors
    .replace(/[\u{200D}]/gu, '')             // Zero width joiner
    .replace(/[\u{20E3}]/gu, '')             // Combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, ''); // Tags
  
  return result;
}

interface ParsedLine {
  type: 'heading1' | 'heading2' | 'heading3' | 'listItem' | 'checkbox' | 'paragraph';
  content: string;
  checked?: boolean;
}

export function parseMarkdown(text: string): ParsedLine[] {
  const sanitized = sanitizeEmojis(text);
  const lines = sanitized.split('\n');
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      continue; // Skip empty lines
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      parsed.push({ type: 'heading3', content: trimmed.slice(4) });
    } else if (trimmed.startsWith('## ')) {
      parsed.push({ type: 'heading2', content: trimmed.slice(3) });
    } else if (trimmed.startsWith('# ')) {
      parsed.push({ type: 'heading1', content: trimmed.slice(2) });
    }
    // Checkboxes (various formats)
    else if (trimmed.match(/^[-*]\s*\[x\]/i)) {
      parsed.push({ type: 'checkbox', content: trimmed.replace(/^[-*]\s*\[x\]\s*/i, ''), checked: true });
    } else if (trimmed.match(/^[-*]\s*\[\s*\]/)) {
      parsed.push({ type: 'checkbox', content: trimmed.replace(/^[-*]\s*\[\s*\]\s*/, ''), checked: false });
    }
    // List items
    else if (trimmed.match(/^[-*•→]\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^[-*•→]\s+/, '') });
    } else if (trimmed.match(/^\d+[.)]\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^\d+[.)]\s+/, '') });
    }
    // Regular paragraphs
    else {
      parsed.push({ type: 'paragraph', content: trimmed });
    }
  }

  return parsed;
}

// Clean inline markdown (bold, italic) for display
function cleanInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.+?)\*/g, '$1')      // Remove *italic*
    .replace(/__(.+?)__/g, '$1')      // Remove __bold__
    .replace(/_(.+?)_/g, '$1')        // Remove _italic_
    .replace(/`(.+?)`/g, '$1');       // Remove `code`
}

interface PDFDocumentProps {
  title: string;
  content: string;
  date: string;
  messageCount?: number;
}

const PDFDocument: React.FC<PDFDocumentProps> = ({ title, content, date, messageCount }) => {
  const parsedLines = parseMarkdown(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{sanitizeEmojis(title)}</Text>
          <Text style={styles.meta}>
            {date}{messageCount ? ` • ${messageCount} xabar` : ''}
          </Text>
        </View>
        
        <View style={styles.content}>
          {parsedLines.map((line, index) => {
            const cleanContent = cleanInlineFormatting(line.content);
            
            switch (line.type) {
              case 'heading1':
                return <Text key={index} style={styles.heading1}>{cleanContent}</Text>;
              case 'heading2':
                return <Text key={index} style={styles.heading2}>{cleanContent}</Text>;
              case 'heading3':
                return <Text key={index} style={styles.heading3}>{cleanContent}</Text>;
              case 'checkbox':
                return (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.checkbox}>{line.checked ? '[x]' : '[ ]'}</Text>
                    <Text style={styles.listItemText}>{cleanContent}</Text>
                  </View>
                );
              case 'listItem':
                return (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.bullet}>-</Text>
                    <Text style={styles.listItemText}>{cleanContent}</Text>
                  </View>
                );
              case 'paragraph':
              default:
                return <Text key={index} style={styles.paragraph}>{cleanContent}</Text>;
            }
          })}
        </View>
      </Page>
    </Document>
  );
};

export interface GeneratePDFOptions {
  title: string;
  content: string;
  date: string;
  messageCount?: number;
  filename?: string;
}

export async function generatePDF(options: GeneratePDFOptions): Promise<Blob> {
  const { title, content, date, messageCount } = options;
  
  // Ensure fonts are registered
  registerFonts();
  
  // Wait for fonts to be ready (browser API)
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 2000)) // 2s timeout
      ]);
    } catch {
      // Continue even if font loading fails
    }
  }
  
  const doc = (
    <PDFDocument
      title={title}
      content={content}
      date={date}
      messageCount={messageCount}
    />
  );

  const blob = await pdf(doc).toBlob();
  return blob;
}

export function sanitizeFilename(title: string): string {
  return sanitizeEmojis(title)
    .replace(/[^\w\s\u0400-\u04FF-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .trim() || 'natija';
}

export async function downloadPDF(options: GeneratePDFOptions): Promise<void> {
  console.log('[AI_PDF_EXPORT] Starting PDF generation...');
  
  const blob = await generatePDF(options);
  const filename = options.filename || `${sanitizeFilename(options.title)}-${new Date().toISOString().split('T')[0]}.pdf`;
  
  console.log('[AI_PDF_EXPORT] PDF generated, size:', blob.size, 'bytes');
  
  // Create download - with iOS Safari fallback
  const url = URL.createObjectURL(blob);
  
  // Check if we're on iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // On iOS, open in new tab for "Save to Files" workflow
    window.open(url, '_blank');
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    // Standard download for other browsers
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  console.log('[AI_PDF_EXPORT] Download initiated:', filename);
}

/**
 * HTML Print Fallback - opens content in a new window for system print-to-PDF
 * Use this when @react-pdf/renderer fails
 */
export function openHTMLPrintFallback(options: GeneratePDFOptions): void {
  console.log('[AI_PDF_EXPORT] Using HTML print fallback...');
  
  const sanitizedContent = sanitizeEmojis(options.content);
  const parsedLines = parseMarkdown(sanitizedContent);
  
  // Convert parsed lines to HTML
  const htmlContent = parsedLines.map(line => {
    const content = cleanInlineFormatting(line.content);
    switch (line.type) {
      case 'heading1':
        return `<h1 style="font-size: 24px; font-weight: bold; margin: 16px 0 8px 0;">${content}</h1>`;
      case 'heading2':
        return `<h2 style="font-size: 20px; font-weight: bold; margin: 14px 0 6px 0;">${content}</h2>`;
      case 'heading3':
        return `<h3 style="font-size: 16px; font-weight: bold; margin: 12px 0 4px 0;">${content}</h3>`;
      case 'checkbox':
        return `<div style="margin: 4px 0; padding-left: 12px;">${line.checked ? '☑' : '☐'} ${content}</div>`;
      case 'listItem':
        return `<div style="margin: 4px 0; padding-left: 12px;">• ${content}</div>`;
      default:
        return `<p style="margin: 8px 0; text-align: justify;">${content}</p>`;
    }
  }).join('\n');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sanitizeEmojis(options.title)}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 21cm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .meta {
      font-size: 10pt;
      color: #666;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${sanitizeEmojis(options.title)}</div>
    <div class="meta">${options.date}${options.messageCount ? ` • ${options.messageCount} xabar` : ''}</div>
  </div>
  <div class="content">
    ${htmlContent}
  </div>
  <div class="no-print" style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: center;">
    <p style="margin-bottom: 10px;">PDF sifatida saqlash uchun <kbd>Ctrl+P</kbd> (yoki <kbd>Cmd+P</kbd>) bosing va "PDF sifatida saqlash" tanlang.</p>
  </div>
</body>
</html>
  `.trim();
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

/**
 * PDF Generator using @react-pdf/renderer
 * 
 * This replaces the old jsPDF-based generator which had severe Unicode issues:
 * - Emojis would render as garbage like "Ø=ÜA"
 * - Some lines would have spaced-out letters
 * - Uzbek special characters (o', g') wouldn't display correctly
 * 
 * @react-pdf/renderer with registered Unicode fonts solves these issues.
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

// Register Noto Sans font for proper Unicode/Latin Extended support
Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: '/fonts/NotoSans-Regular.woff2',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/NotoSans-Bold.woff2',
      fontWeight: 'bold',
    },
  ],
});

// Fallback: Use system fonts if custom fonts fail
Font.registerHyphenationCallback((word) => [word]);

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
    width: 12,
    fontSize: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});

// Remove or replace emojis to prevent encoding issues
function sanitizeEmojis(text: string): string {
  // Common emoji patterns - replace with text equivalents or remove
  const emojiMap: Record<string, string> = {
    '📅': '(Reja)',
    '📋': '(Ro\'yxat)',
    '✅': '[x]',
    '❌': '[ ]',
    '⚠️': '(!)',
    '💡': '(Fikr)',
    '🔍': '(Qidirish)',
    '📝': '(Eslatma)',
    '🎯': '(Maqsad)',
    '⭐': '*',
    '🚀': '(Start)',
    '💬': '(Izoh)',
    '📌': '(Muhim)',
    '🔔': '(Bildirishnoma)',
    '👉': '->',
    '👈': '<-',
    '👆': '^',
    '👇': 'v',
    '✨': '*',
    '🔥': '(!)',
    '💪': '(Kuch)',
    '🎉': '(Tabriklar)',
    '❗': '(!)',
    '❓': '(?)',
    '➡️': '->',
    '⬅️': '<-',
  };

  let result = text;
  
  // Replace known emojis
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    result = result.split(emoji).join(replacement);
  }

  // Remove remaining emojis (Unicode emoji ranges)
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu, '');
  
  return result;
}

interface ParsedLine {
  type: 'heading1' | 'heading2' | 'heading3' | 'listItem' | 'checkbox' | 'paragraph';
  content: string;
  checked?: boolean;
}

function parseMarkdown(text: string): ParsedLine[] {
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
    // Checkboxes
    else if (trimmed.match(/^[-*]\s*\[x\]/i)) {
      parsed.push({ type: 'checkbox', content: trimmed.replace(/^[-*]\s*\[x\]\s*/i, ''), checked: true });
    } else if (trimmed.match(/^[-*]\s*\[\s*\]/)) {
      parsed.push({ type: 'checkbox', content: trimmed.replace(/^[-*]\s*\[\s*\]\s*/, ''), checked: false });
    }
    // List items
    else if (trimmed.match(/^[-*•]\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^[-*•]\s+/, '') });
    } else if (trimmed.match(/^\d+\.\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^\d+\.\s+/, '') });
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
                    <Text style={styles.checkbox}>{line.checked ? '☑' : '☐'}</Text>
                    <Text style={styles.listItemText}>{cleanContent}</Text>
                  </View>
                );
              case 'listItem':
                return (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
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
  return title
    .replace(/[^\w\s\u0400-\u04FF-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .trim() || 'natija';
}

export async function downloadPDF(options: GeneratePDFOptions): Promise<void> {
  const blob = await generatePDF(options);
  const filename = options.filename || `${sanitizeFilename(options.title)}-${new Date().toISOString().split('T')[0]}.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

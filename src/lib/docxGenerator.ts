/**
 * DOCX Generator for exporting AI responses to editable Word documents
 * Uses the `docx` library - fully client-side, no server costs
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

interface ParsedLine {
  type: 'heading1' | 'heading2' | 'heading3' | 'listItem' | 'checkbox' | 'paragraph';
  content: string;
  checked?: boolean;
}

function parseMarkdown(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) continue;

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
    else if (trimmed.match(/^[-*•→]\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^[-*•→]\s+/, '') });
    } else if (trimmed.match(/^\d+[.)]\s+/)) {
      parsed.push({ type: 'listItem', content: trimmed.replace(/^\d+[.)]\s+/, '') });
    }
    // Paragraphs
    else {
      parsed.push({ type: 'paragraph', content: trimmed });
    }
  }

  return parsed;
}

function cleanInlineFormatting(text: string): TextRun[] {
  // Parse bold/italic and create TextRuns
  const runs: TextRun[] = [];
  let remaining = text;
  
  // Simple approach: strip formatting for now (can enhance later)
  const cleanText = remaining
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1');
  
  runs.push(new TextRun({ text: cleanText }));
  return runs;
}

export interface GenerateDocxOptions {
  title: string;
  content: string;
  filename?: string;
}

export async function generateDocx(options: GenerateDocxOptions): Promise<Blob> {
  const { title, content } = options;
  
  // Remove first line if it matches title (avoid duplication)
  const titleLower = title.trim().toLowerCase().replace(/[""'']/g, '"');
  const lines = content.trim().split('\n');
  let contentToRender = content;
  
  if (lines.length > 0) {
    const firstLine = lines[0].trim().toLowerCase().replace(/[""'']/g, '"').replace(/^#+\s*/, '');
    if (firstLine === titleLower || 
        titleLower.includes(firstLine) || 
        firstLine.includes(titleLower) ||
        firstLine.replace(/[^a-z0-9]/g, '') === titleLower.replace(/[^a-z0-9]/g, '')) {
      contentToRender = lines.slice(1).join('\n').trim();
    }
  }
  
  const parsedLines = parseMarkdown(contentToRender);
  
  // Build document paragraphs
  const paragraphs: Paragraph[] = [
    // Document title
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    }),
  ];
  
  for (const line of parsedLines) {
    switch (line.type) {
      case 'heading1':
        paragraphs.push(new Paragraph({
          children: cleanInlineFormatting(line.content),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }));
        break;
        
      case 'heading2':
        paragraphs.push(new Paragraph({
          children: cleanInlineFormatting(line.content),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }));
        break;
        
      case 'heading3':
        paragraphs.push(new Paragraph({
          children: cleanInlineFormatting(line.content),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        }));
        break;
        
      case 'checkbox':
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: line.checked ? '☑ ' : '☐ ' }),
            ...cleanInlineFormatting(line.content),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        }));
        break;
        
      case 'listItem':
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: '• ' }),
            ...cleanInlineFormatting(line.content),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        }));
        break;
        
      case 'paragraph':
      default:
        paragraphs.push(new Paragraph({
          children: cleanInlineFormatting(line.content),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
        }));
        break;
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  return blob;
}

export function sanitizeFilename(title: string): string {
  return title
    .replace(/[^\w\s\u0400-\u04FF-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .trim() || 'document';
}

export async function downloadDocx(options: GenerateDocxOptions): Promise<void> {
  console.log('[DOCX Export] Starting generation...');
  
  const blob = await generateDocx(options);
  const filename = options.filename || `${sanitizeFilename(options.title)}.docx`;
  
  console.log('[DOCX Export] Generated, size:', blob.size, 'bytes');
  
  saveAs(blob, filename);
  
  console.log('[DOCX Export] Download initiated:', filename);
}

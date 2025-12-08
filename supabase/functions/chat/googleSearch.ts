// googleSearch.ts — Legacy wrapper, now routes through main google.ts
// Kept for backwards compatibility with any direct imports

import { googleSearch as mainGoogleSearch, setSearchUserId, setSearchLang } from "./google.ts";

export async function googleSearch(query: string): Promise<any[]> {
  // Set defaults (caller should set these via main module)
  setSearchUserId(null);
  setSearchLang("uz");
  
  const result = await mainGoogleSearch(query);
  
  if (result.isBusy || !result.content) {
    return [];
  }
  
  // Parse formatted content back to array format for legacy callers
  // This is a best-effort extraction
  const lines = result.content.split('\n');
  const results: any[] = [];
  
  let current: any = null;
  for (const line of lines) {
    const titleMatch = line.match(/^\*\*(\d+)\.\s+(.+)\*\*$/);
    if (titleMatch) {
      if (current) results.push(current);
      current = { title: titleMatch[2], link: "", snippet: "", formattedUrl: "" };
    } else if (current && line.startsWith('http')) {
      current.link = line.trim();
      current.formattedUrl = line.trim();
    } else if (current && line.trim() && !line.startsWith('---') && !line.includes('Google Custom Search')) {
      current.snippet = (current.snippet ? current.snippet + ' ' : '') + line.trim();
    }
  }
  if (current) results.push(current);
  
  return results.slice(0, 5);
}

// google.ts — SAFE Google Search wrapper

export async function googleSearch(query: string): Promise<string> {
  try {
    const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const cx = Deno.env.get("GOOGLE_CX");

    if (!apiKey || !cx) {
      console.log("❌ Google Search disabled — missing API key or CX");
      return "";
    }

    // Hard timeout protector (3 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const url =
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log("❌ Google returned non-200:", res.status);
      return "";
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.log("ℹ️ Google search: no results");
      return "";
    }

    // Format results into readable markdown
    let formatted = "🔍 **Qidiruv natijalari:**\n\n";

    data.items.slice(0, 5).forEach((item: any, i: number) => {
      formatted += `**${i + 1}. ${item.title}**\n`;
      formatted += `${item.link}\n`;
      if (item.snippet) formatted += `${item.snippet}\n`;
      formatted += "\n";
    });

    formatted += "------\n";
    formatted += "Yuqoridagi manbalar Google Custom Search orqali topildi.\n";

    return formatted;
  } catch (err) {
    console.log("❌ Google search error:", err);
    return "";
  }
}

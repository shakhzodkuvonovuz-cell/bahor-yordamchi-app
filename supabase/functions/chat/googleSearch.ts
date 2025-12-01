export async function googleSearch(query: string): Promise<any[]> {
  const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const cx = Deno.env.get("GOOGLE_CX");

  // Minimal logging to prevent edge function hangs
  console.log("🔍 Search:", query.substring(0, 50), "| Keys exist:", !!apiKey, !!cx);

  if (!apiKey || !cx) {
    console.error("❌ Missing GOOGLE_SEARCH_API_KEY or GOOGLE_CX");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "5");

    const res = await fetch(url.toString());
    
    // Quick fail on non-200 without logging huge error bodies
    if (!res.ok) {
      console.error("❌ Google API error:", res.status);
      return [];
    }

    const data = await res.json();
    
    if (data.error) {
      console.error("❌ Google error code:", data.error.code || "unknown");
      return [];
    }

    if (!data.items || data.items.length === 0) {
      console.log("⚠️ No results found");
      return [];
    }

    const results = data.items.slice(0, 5).map((item: any) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      formattedUrl: item.formattedUrl || "",
    }));

    console.log(`✅ ${results.length} results`);
    return results;
  } catch (error) {
    console.error("❌ Search exception");
    return [];
  }
}

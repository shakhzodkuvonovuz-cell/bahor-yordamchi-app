export async function googleSearch(query: string) {
  const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const cx = Deno.env.get("GOOGLE_CX");

  console.log("🔍 Google Search starting...");
  console.log("API Key exists:", !!apiKey);
  console.log("CX exists:", !!cx);

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

    console.log("🌐 Fetching:", url.toString().replace(apiKey, "***API_KEY***"));

    const res = await fetch(url.toString());
    
    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Google API error:", res.status, errorText);
      return [];
    }

    const data = await res.json();
    
    // Log search info
    console.log("📊 Search info:", JSON.stringify(data.searchInformation || {}, null, 2));
    
    if (data.error) {
      console.error("❌ Google API returned error:", JSON.stringify(data.error, null, 2));
      return [];
    }

    if (!data.items || data.items.length === 0) {
      console.warn("⚠️ Google returned 0 results for query:", query);
      console.log("📦 Full response:", JSON.stringify(data, null, 2));
      return [];
    }

    const results = data.items.map((item: any) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      formattedUrl: item.formattedUrl || "",
    }));

    console.log(`✅ Returning ${results.length} search results`);
    return results;
  } catch (error) {
    console.error("❌ googleSearch() exception:", error);
    return [];
  }
}

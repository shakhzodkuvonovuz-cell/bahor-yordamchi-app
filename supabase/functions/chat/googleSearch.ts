export async function googleSearch(query: string) {
  const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const cx = Deno.env.get("GOOGLE_CX");

  if (!apiKey || !cx) {
    console.error("Google Search API key or CX not configured");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!data.items) return [];

    return data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet || "",
      formattedUrl: item.formattedUrl || "",
    }));
  } catch (error) {
    console.error("Google Search error:", error);
    return [];
  }
}

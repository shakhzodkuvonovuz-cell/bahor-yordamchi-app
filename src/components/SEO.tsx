import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

const BASE_URL = "https://www.bahorai.com";
const DEFAULT_IMAGE = `${BASE_URL}/og.png`;
const SITE_NAME = "Bahor AI";

export function SEO({
  title,
  description = "Birinchi o'zbek tiliga moslangan sun'iy intellekt yordamchi. ChatGPT'dan arzonroq, osonroq va o'zbeklar uchun yaratilgan.",
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Birinchi o'zbek sun'iy intellekti`;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Primary meta tags
    setMeta("title", fullTitle);
    setMeta("description", description);

    // Open Graph
    setMeta("og:type", type, true);
    setMeta("og:url", fullUrl, true);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:image", fullImage, true);
    setMeta("og:site_name", SITE_NAME, true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:url", fullUrl);
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", fullImage);

    // Robots
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = fullUrl;

    // Cleanup on unmount - reset to defaults
    return () => {
      document.title = `${SITE_NAME} – Birinchi o'zbek sun'iy intellekti`;
    };
  }, [fullTitle, description, fullImage, fullUrl, type, noIndex]);

  return null;
}

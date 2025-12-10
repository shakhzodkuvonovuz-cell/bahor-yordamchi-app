import { Download } from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";

const logos = [
  { name: "bahor-logo.png", src: bahorLogo, desc: "Main App Logo" },
  { name: "icon-512.png", src: "/icon-512.png", desc: "512px PWA Icon" },
  { name: "icon-192.png", src: "/icon-192.png", desc: "192px PWA Icon" },
  { name: "favicon.png", src: "/favicon.png", desc: "Main Favicon" },
  { name: "favicon-32x32.png", src: "/favicon-32x32.png", desc: "32x32 Favicon" },
  { name: "apple-touch-icon.png", src: "/apple-touch-icon.png", desc: "iOS Home Screen Icon" },
  { name: "bahorai-social.png", src: "/bahorai-social.png", desc: "Social Media Preview" },
  { name: "og.png", src: "/og.png", desc: "Open Graph Image" },
];

export default function Logos() {
  const handleDownload = async (src: string, name: string) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Bahor AI Logos</h1>
        <p className="text-muted-foreground mb-6">Click any logo to download</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {logos.map((logo) => (
            <button
              key={logo.name}
              onClick={() => handleDownload(logo.src, logo.name)}
              className="group flex flex-col items-center p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/30 hover:border-border transition-all"
            >
              <div className="relative w-20 h-20 mb-3 flex items-center justify-center bg-muted/50 rounded-lg">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                  <Download className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-foreground truncate w-full text-center">{logo.name}</p>
              <p className="text-[10px] text-muted-foreground truncate w-full text-center">{logo.desc}</p>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-8 text-center">
          Temporary page — delete after downloading
        </p>
      </div>
    </div>
  );
}

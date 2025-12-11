import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin email to receive notifications
const ADMIN_EMAIL = "shakhzodkuvonov.uz@gmail.com";

interface FeedbackNotification {
  category: string;
  message: string;
  email: string | null;
  screenshot_url: string | null;
  route: string | null;
  app_version: string | null;
}

const getCategoryEmoji = (category: string): string => {
  switch (category) {
    case "bug": return "🐛";
    case "idea": return "💡";
    default: return "💬";
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case "bug": return "Bug Report";
    case "idea": return "Feature Idea";
    default: return "Other Feedback";
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[notify-feedback] Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feedback: FeedbackNotification = await req.json();
    console.log("[notify-feedback] Feedback data:", { category: feedback.category, hasScreenshot: !!feedback.screenshot_url });

    const emoji = getCategoryEmoji(feedback.category);
    const categoryLabel = getCategoryLabel(feedback.category);
    
    const screenshotSection = feedback.screenshot_url 
      ? `<p><strong>Screenshot:</strong><br><a href="${feedback.screenshot_url}" style="color: #3b82f6;">View Screenshot</a></p>`
      : "";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #171717; border-radius: 12px; padding: 24px; border: 1px solid #262626; }
    .header { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #fff; }
    .badge { display: inline-block; background: #262626; padding: 6px 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
    .message-box { background: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; }
    .meta { color: #737373; font-size: 13px; margin-top: 16px; }
    .meta strong { color: #a3a3a3; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${emoji} New ${categoryLabel}</div>
    <div class="badge">${categoryLabel}</div>
    
    <div class="message-box">${feedback.message}</div>
    
    ${screenshotSection}
    
    <div class="meta">
      <p><strong>From:</strong> ${feedback.email || "Anonymous user"}</p>
      <p><strong>Route:</strong> ${feedback.route || "Unknown"}</p>
      <p><strong>App Version:</strong> ${feedback.app_version || "Unknown"}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" })}</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Bahor AI <support@bahorai.com>",
      to: [ADMIN_EMAIL],
      subject: `${emoji} ${categoryLabel}: ${feedback.message.substring(0, 50)}${feedback.message.length > 50 ? "..." : ""}`,
      html: emailHtml,
    });

    console.log("[notify-feedback] Email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[notify-feedback] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

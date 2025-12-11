import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "password_reset" | "email_confirmation" | "magic_link" | "welcome";
  email: string;
  token?: string;
  redirectUrl?: string;
  userName?: string;
}

// Beautiful HTML email template
const getEmailTemplate = (type: string, params: { token?: string; redirectUrl?: string; userName?: string }) => {
  const baseUrl = "https://www.bahorai.com";
  const logoUrl = "https://www.bahorai.com/bahor-logo.png";
  
  const styles = `
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(180deg, #1a1a24 0%, #12121a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo img { height: 48px; width: auto; }
    .logo-text { color: #00d4aa; font-size: 24px; font-weight: 700; margin-top: 8px; }
    h1 { color: #ffffff; font-size: 28px; margin: 0 0 16px; text-align: center; font-weight: 600; }
    p { color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center; }
    .button { display: block; width: 100%; max-width: 280px; margin: 32px auto; padding: 16px 32px; background: linear-gradient(135deg, #00d4aa 0%, #00b896 100%); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0, 212, 170, 0.3); }
    .button:hover { background: linear-gradient(135deg, #00e4ba 0%, #00c8a6 100%); }
    .code { background: rgba(0, 212, 170, 0.1); border: 1px solid rgba(0, 212, 170, 0.3); border-radius: 8px; padding: 16px 24px; font-size: 32px; font-weight: 700; color: #00d4aa; text-align: center; letter-spacing: 4px; margin: 24px 0; font-family: monospace; }
    .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
    .footer p { color: #606070; font-size: 13px; margin: 0; }
    .footer a { color: #00d4aa; text-decoration: none; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,170,0.3), transparent); margin: 24px 0; }
    .note { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-top: 24px; }
    .note p { color: #808090; font-size: 14px; margin: 0; }
  `;

  const templates: Record<string, { subject: string; html: string }> = {
    password_reset: {
      subject: "Parolni tiklash — Bahor AI",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>${styles}</style></head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <div class="logo-text">🌸 Bahor AI</div>
              </div>
              <h1>Parolni tiklash</h1>
              <p>Assalomu alaykum${params.userName ? `, ${params.userName}` : ''}! Hisobingiz uchun parolni tiklash so'rovi yuborildi.</p>
              <div class="divider"></div>
              <p>Yangi parol o'rnatish uchun quyidagi tugmani bosing:</p>
              <a href="${params.redirectUrl || baseUrl + '/auth/reset'}" class="button">Yangi parol o'rnatish</a>
              <div class="note">
                <p>⏰ Bu havola 1 soat davomida amal qiladi. Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
              </div>
              <div class="footer">
                <p>© 2025 Bahor AI. Barcha huquqlar himoyalangan.</p>
                <p><a href="${baseUrl}">www.bahorai.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    email_confirmation: {
      subject: "Email tasdiqlash — Bahor AI",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>${styles}</style></head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <div class="logo-text">🌸 Bahor AI</div>
              </div>
              <h1>Email manzilingizni tasdiqlang</h1>
              <p>Assalomu alaykum${params.userName ? `, ${params.userName}` : ''}! Bahor AI ga xush kelibsiz! Hisobingizni faollashtirish uchun email manzilingizni tasdiqlang.</p>
              <div class="divider"></div>
              <a href="${params.redirectUrl || baseUrl + '/auth/callback'}" class="button">Email ni tasdiqlash</a>
              <div class="note">
                <p>🔒 Agar siz Bahor AI da ro'yxatdan o'tmagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
              </div>
              <div class="footer">
                <p>© 2025 Bahor AI. Barcha huquqlar himoyalangan.</p>
                <p><a href="${baseUrl}">www.bahorai.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    magic_link: {
      subject: "Kirish havolasi — Bahor AI",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>${styles}</style></head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <div class="logo-text">🌸 Bahor AI</div>
              </div>
              <h1>Tizimga kirish</h1>
              <p>Assalomu alaykum! Bahor AI hisobingizga kirish uchun maxsus havola tayyor.</p>
              <div class="divider"></div>
              <a href="${params.redirectUrl || baseUrl + '/auth/callback'}" class="button">Hisobga kirish</a>
              <div class="note">
                <p>⏰ Bu havola 1 soat davomida amal qiladi va faqat bir marta ishlatilishi mumkin.</p>
              </div>
              <div class="footer">
                <p>© 2025 Bahor AI. Barcha huquqlar himoyalangan.</p>
                <p><a href="${baseUrl}">www.bahorai.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    welcome: {
      subject: "Xush kelibsiz — Bahor AI",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>${styles}</style></head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <div class="logo-text">🌸 Bahor AI</div>
              </div>
              <h1>Xush kelibsiz, ${params.userName || 'do\'stim'}!</h1>
              <p>Bahor AI oilasiga qo'shilganingiz uchun rahmat! Endi siz sun'iy intellekt yordamida har qanday savolingizga javob olishingiz mumkin.</p>
              <div class="divider"></div>
              <p><strong>Bahor AI imkoniyatlari:</strong></p>
              <p>🔍 Internetdan qidirish va yangiliklar<br>
              🎨 Rasm yaratish va tahrirlash<br>
              📄 Hujjatlar bilan ishlash<br>
              💬 Ko'p tilli suhbat</p>
              <a href="${baseUrl}/modes" class="button">Boshlash</a>
              <div class="footer">
                <p>Savollaringiz bo'lsa, <a href="mailto:support@bahorai.com">support@bahorai.com</a> ga yozing.</p>
                <p>© 2025 Bahor AI. Barcha huquqlar himoyalangan.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  };

  return templates[type] || templates.welcome;
};

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[send-branded-email:${requestId}] Request received`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, token, redirectUrl, userName }: EmailRequest = await req.json();

    console.log(`[send-branded-email:${requestId}] Sending ${type} email to ${email}`);

    if (!email || !type) {
      return new Response(
        JSON.stringify({ ok: false, error: "Email and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = getEmailTemplate(type, { token, redirectUrl, userName });

    const { data, error } = await resend.emails.send({
      from: "Bahor AI <support@bahorai.com>",
      to: [email],
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error(`[send-branded-email:${requestId}] Resend error:`, error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-branded-email:${requestId}] Email sent successfully:`, data);

    return new Response(
      JSON.stringify({ ok: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error(`[send-branded-email:${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

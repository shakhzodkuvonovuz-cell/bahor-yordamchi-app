import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("AUTH_SEND_EMAIL_HOOK_SECRET");

// Premium HTML email templates with beautiful design matching Bahor AI brand
const getEmailTemplate = (
  type: string,
  params: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
    userName?: string;
  }
) => {
  const baseUrl = params.site_url || "https://www.bahorai.com";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  // Build the verification URL
  const buildVerifyUrl = () => {
    if (params.token_hash && params.email_action_type) {
      const redirectTo = params.redirect_to || `${baseUrl}/`;
      return `${supabaseUrl}/auth/v1/verify?token=${params.token_hash}&type=${params.email_action_type}&redirect_to=${encodeURIComponent(redirectTo)}`;
    }
    return params.redirect_to || baseUrl;
  };

  const verifyUrl = buildVerifyUrl();

  // Shared email wrapper with premium dark theme
  const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bahor AI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #09090b;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto;">
          <!-- Logo & Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); width: 56px; height: 56px; border-radius: 16px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px; line-height: 56px;">🌸</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Bahor AI</p>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #52525b;">
                © 2025 Bahor AI. Barcha huquqlar himoyalangan.
              </p>
              <p style="margin: 0; font-size: 13px;">
                <a href="${baseUrl}" style="color: #14b8a6; text-decoration: none;">www.bahorai.com</a>
                <span style="color: #3f3f46; margin: 0 8px;">•</span>
                <a href="mailto:support@bahorai.com" style="color: #14b8a6; text-decoration: none;">Yordam</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const templates: Record<string, { subject: string; html: string }> = {
    signup: {
      subject: "✨ Email tasdiqlang — Bahor AI",
      html: emailWrapper(`
        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
          <tr>
            <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%); border-radius: 20px; text-align: center; border: 1px solid rgba(20,184,166,0.2);">
              <span style="font-size: 32px; line-height: 72px;">✉️</span>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">Email tasdiqlash</h1>
        
        <!-- Welcome text -->
        <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Bahor AI ga xush kelibsiz! Hisobingizni faollashtirish uchun email manzilingizni tasdiqlang.
        </p>
        
        <!-- Divider -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent);"></td>
          </tr>
        </table>
        
        <!-- Benefits -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #14b8a6; font-size: 16px; margin-right: 12px;">✓</span>
              <span style="color: #d4d4d8; font-size: 15px;">14 kunlik bepul Premium sinov</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #14b8a6; font-size: 16px; margin-right: 12px;">✓</span>
              <span style="color: #d4d4d8; font-size: 15px;">Kuniga 10 ta AI so'rov</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #14b8a6; font-size: 16px; margin-right: 12px;">✓</span>
              <span style="color: #d4d4d8; font-size: 15px;">Web qidiruv va rasm yaratish</span>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 8px auto 0;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 14px; box-shadow: 0 8px 24px -4px rgba(20,184,166,0.4);">
              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
                Email ni tasdiqlash ✓
              </a>
            </td>
          </tr>
        </table>
        
        <!-- OTP Code if available -->
        ${params.token ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">Yoki tasdiqlash kodini kiriting:</p>
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #14b8a6; letter-spacing: 6px; font-family: monospace;">${params.token}</p>
            </td>
          </tr>
        </table>
        ` : ''}
        
        <!-- Note -->
        <p style="margin: 28px 0 0; font-size: 13px; color: #52525b; text-align: center; line-height: 1.5;">
          Agar siz Bahor AI da ro'yxatdan o'tmagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.
        </p>
      `)
    },

    recovery: {
      subject: "🔐 Parolni tiklash — Bahor AI",
      html: emailWrapper(`
        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
          <tr>
            <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%); border-radius: 20px; text-align: center; border: 1px solid rgba(20,184,166,0.2);">
              <span style="font-size: 32px; line-height: 72px;">🔐</span>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">Parolni tiklash</h1>
        
        <!-- Greeting -->
        <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Assalomu alaykum! Hisobingiz uchun parolni tiklash so'rovi yuborildi.
        </p>
        
        <!-- Divider -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent);"></td>
          </tr>
        </table>
        
        <!-- Info text -->
        <p style="margin: 24px 0; font-size: 15px; color: #71717a; text-align: center; line-height: 1.6;">
          Yangi parol o'rnatish uchun quyidagi tugmani bosing. Havola 1 soat davomida amal qiladi.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 14px; box-shadow: 0 8px 24px -4px rgba(20,184,166,0.4);">
              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
                Yangi parol o'rnatish →
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Security Note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
          <tr>
            <td style="background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15); border-radius: 12px; padding: 16px 20px;">
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                <span style="color: #fbbf24;">⚠️</span> Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring va parolingizni hech kimga bermang.
              </p>
            </td>
          </tr>
        </table>
      `)
    },

    magiclink: {
      subject: "🔗 Kirish havolasi — Bahor AI",
      html: emailWrapper(`
        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
          <tr>
            <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%); border-radius: 20px; text-align: center; border: 1px solid rgba(20,184,166,0.2);">
              <span style="font-size: 32px; line-height: 72px;">🔗</span>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">Tizimga kirish</h1>
        
        <!-- Text -->
        <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Assalomu alaykum! Bahor AI hisobingizga kirish uchun maxsus havola tayyor.
        </p>
        
        <!-- Divider -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent);"></td>
          </tr>
        </table>
        
        <!-- Timer note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
          <tr>
            <td style="text-align: center;">
              <span style="display: inline-block; background: rgba(20,184,166,0.1); border: 1px solid rgba(20,184,166,0.2); border-radius: 8px; padding: 8px 16px; font-size: 14px; color: #14b8a6;">
                ⏱️ Havola 1 soat davomida amal qiladi
              </span>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 14px; box-shadow: 0 8px 24px -4px rgba(20,184,166,0.4);">
              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
                Hisobga kirish →
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Security Note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
          <tr>
            <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px 20px;">
              <p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                <span style="color: #14b8a6;">🔒</span> Bu havola faqat bir marta ishlatilishi mumkin. Xavfsizlik uchun uni hech kim bilan ulashmang.
              </p>
            </td>
          </tr>
        </table>
      `)
    },

    email_change: {
      subject: "📧 Email o'zgartirish — Bahor AI",
      html: emailWrapper(`
        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
          <tr>
            <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%); border-radius: 20px; text-align: center; border: 1px solid rgba(20,184,166,0.2);">
              <span style="font-size: 32px; line-height: 72px;">📧</span>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">Email o'zgartirish</h1>
        
        <!-- Text -->
        <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Siz Bahor AI hisobingiz uchun yangi email manzilini tasdiqlashni so'radingiz.
        </p>
        
        <!-- Divider -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent);"></td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto 0;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 14px; box-shadow: 0 8px 24px -4px rgba(20,184,166,0.4);">
              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
                Yangi email ni tasdiqlash ✓
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Security Note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
          <tr>
            <td style="background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15); border-radius: 12px; padding: 16px 20px;">
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                <span style="color: #fbbf24;">⚠️</span> Agar siz bu so'rovni yubormagan bo'lsangiz, hisobingizga ruxsatsiz kirish bo'lgan bo'lishi mumkin. Iltimos, parolingizni o'zgartiring.
              </p>
            </td>
          </tr>
        </table>
      `)
    }
  };

  // Map email_action_type to template
  const typeMap: Record<string, string> = {
    signup: "signup",
    email_confirmation: "signup",
    recovery: "recovery",
    magiclink: "magiclink",
    email_change: "email_change",
    invite: "signup"
  };

  const templateKey = typeMap[type] || typeMap[params.email_action_type || ""] || "signup";
  return templates[templateKey] || templates.signup;
};

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[auth-send-email:${requestId}] Request received`);

  if (req.method !== "POST") {
    console.log(`[auth-send-email:${requestId}] Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    console.log(`[auth-send-email:${requestId}] Received payload length: ${payload.length}`);

    // Verify the webhook signature if secret is configured
    let webhookData: any;
    
    if (hookSecret) {
      console.log(`[auth-send-email:${requestId}] Verifying webhook signature`);
      const wh = new Webhook(hookSecret);
      webhookData = wh.verify(payload, headers);
    } else {
      console.log(`[auth-send-email:${requestId}] No hook secret configured, parsing payload directly`);
      webhookData = JSON.parse(payload);
    }

    const { user, email_data } = webhookData;
    
    console.log(`[auth-send-email:${requestId}] Processing email for user: ${user?.email}, type: ${email_data?.email_action_type}`);

    if (!user?.email || !email_data) {
      console.error(`[auth-send-email:${requestId}] Missing user email or email_data`);
      return new Response(JSON.stringify({ error: "Missing required data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const template = getEmailTemplate(email_data.email_action_type, {
      token: email_data.token,
      token_hash: email_data.token_hash,
      redirect_to: email_data.redirect_to,
      email_action_type: email_data.email_action_type,
      site_url: email_data.site_url
    });

    console.log(`[auth-send-email:${requestId}] Sending ${email_data.email_action_type} email to ${user.email}`);

    const { data, error } = await resend.emails.send({
      from: "Bahor AI <support@bahorai.com>",
      to: [user.email],
      subject: template.subject,
      html: template.html
    });

    if (error) {
      console.error(`[auth-send-email:${requestId}] Resend error:`, error);
      return new Response(
        JSON.stringify({
          error: {
            http_code: 500,
            message: error.message
          }
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[auth-send-email:${requestId}] Email sent successfully:`, data);

    // Return empty object to indicate success (required by Supabase auth hooks)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error(`[auth-send-email:${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message
        }
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);

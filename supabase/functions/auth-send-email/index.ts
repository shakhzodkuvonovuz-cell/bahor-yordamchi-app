import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Premium HTML email templates with beautiful design matching Bahor AI brand
const getEmailTemplate = (
  type: string,
  params: {
    token?: string;
    confirmUrl?: string;
    userName?: string;
  }
) => {
  const baseUrl = "https://www.bahorai.com";

  // Shared email wrapper with premium dark theme
  const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bahor AI</title>
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
              <a href="${params.confirmUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
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
              <a href="${params.confirmUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
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
                <span style="color: #fbbf24;">⚠️</span> Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.
              </p>
            </td>
          </tr>
        </table>
      `)
    },

    resend: {
      subject: "✨ Email tasdiqlang — Bahor AI",
      html: emailWrapper(`
        <!-- Icon -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
          <tr>
            <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.1) 100%); border-radius: 20px; text-align: center; border: 1px solid rgba(20,184,166,0.2);">
              <span style="font-size: 32px; line-height: 72px;">🔄</span>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.5px;">Tasdiqlash xabari</h1>
        
        <!-- Text -->
        <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 8px auto 0;">
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 14px; box-shadow: 0 8px 24px -4px rgba(20,184,166,0.4);">
              <a href="${params.confirmUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none; letter-spacing: 0.3px;">
                Email ni tasdiqlash ✓
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Note -->
        <p style="margin: 28px 0 0; font-size: 13px; color: #52525b; text-align: center; line-height: 1.5;">
          Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.
        </p>
      `)
    }
  };

  return templates[type] || templates.signup;
};

interface EmailRequest {
  email: string;
  type: "signup" | "recovery" | "resend";
  redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[auth-send-email:${requestId}] Request received`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { email, type, redirectTo }: EmailRequest = await req.json();
    
    console.log(`[auth-send-email:${requestId}] Processing ${type} email for ${email}`);

    if (!email || !type) {
      return new Response(JSON.stringify({ error: "Missing email or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate link for verification
    let otpData: any;
    let otpError: any;
    
    if (type === "recovery") {
      const result = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: redirectTo || "https://www.bahorai.com/auth/callback"
        }
      });
      otpData = result.data;
      otpError = result.error;
    } else {
      const result = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password: crypto.randomUUID(), // Temp password, user already has account
        options: {
          redirectTo: redirectTo || "https://www.bahorai.com/auth/callback"
        }
      });
      otpData = result.data;
      otpError = result.error;
    }

    if (otpError) {
      console.error(`[auth-send-email:${requestId}] OTP generation error:`, otpError);
      return new Response(JSON.stringify({ error: otpError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const confirmUrl = otpData?.properties?.action_link;
    
    if (!confirmUrl) {
      console.error(`[auth-send-email:${requestId}] No confirmation URL generated`);
      return new Response(JSON.stringify({ error: "Failed to generate confirmation link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[auth-send-email:${requestId}] Generated confirmation URL`);

    // Get email template
    const template = getEmailTemplate(type, { 
      confirmUrl,
      token: undefined // OTP token if needed
    });

    // Send branded email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Bahor AI <noreply@bahorai.com>",
      to: [email],
      subject: template.subject,
      html: template.html,
    });

    if (emailError) {
      console.error(`[auth-send-email:${requestId}] Resend error:`, emailError);
      return new Response(JSON.stringify({ error: emailError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[auth-send-email:${requestId}] Email sent successfully:`, emailData?.id);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailData?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error(`[auth-send-email:${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);

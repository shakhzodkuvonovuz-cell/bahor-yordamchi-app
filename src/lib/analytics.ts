import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "first_message_sent"
  | "file_uploaded"
  | "premium_clicked"
  | "answer_reported"
  | "onboarding_completed"
  | "mode_selected"
  | "chat_created"
  | "format_button_clicked"
  | "preferences_updated";

interface EventProps {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track analytics events - logs to console in dev, writes to Supabase in prod
 */
export async function track(eventName: EventName, props?: EventProps): Promise<void> {
  // Always log in development
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, props);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Attempt to insert into analytics_events table
    // If table doesn't exist, this will fail silently
    const { error } = await supabase
      .from("analytics_events" as any)
      .insert({
        user_id: user?.id || null,
        event: eventName,
        props_json: props ? JSON.stringify(props) : null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // Table might not exist yet - fail silently
      if (import.meta.env.DEV) {
        console.warn("[Analytics] Failed to track event:", error.message);
      }
    }
  } catch (e) {
    // Never break UX for analytics
    if (import.meta.env.DEV) {
      console.warn("[Analytics] Error:", e);
    }
  }
}

/**
 * Track signup start
 */
export const trackSignupStarted = (method: "email" | "google" | "phone") => 
  track("signup_started", { method });

/**
 * Track successful signup
 */
export const trackSignupCompleted = (method: "email" | "google" | "phone") => 
  track("signup_completed", { method });

/**
 * Track successful login
 */
export const trackLoginCompleted = (method: "email" | "google" | "phone") => 
  track("login_completed", { method });

/**
 * Track first message in a conversation
 */
export const trackFirstMessageSent = (mode: string) => 
  track("first_message_sent", { mode });

/**
 * Track file upload
 */
export const trackFileUploaded = (fileType: string, sizeKb: number) => 
  track("file_uploaded", { fileType, sizeKb });

/**
 * Track premium button click
 */
export const trackPremiumClicked = (source: string) => 
  track("premium_clicked", { source });

/**
 * Track answer report
 */
export const trackAnswerReported = (reason: string) => 
  track("answer_reported", { reason });

/**
 * Track onboarding completion
 */
export const trackOnboardingCompleted = (goal: string, language: string) => 
  track("onboarding_completed", { goal, language });

/**
 * Track mode selection
 */
export const trackModeSelected = (mode: string) => 
  track("mode_selected", { mode });

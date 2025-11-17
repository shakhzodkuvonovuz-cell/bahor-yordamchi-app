import { ChatMode } from "@/types/chat";

/**
 * Dummy AI service for MVP v0
 * This will be replaced with real API calls in future versions
 */
export function getDummyAiResponse(mode: ChatMode, userMessage: string): string {
  // Add a small delay to simulate network request
  const responses: Record<ChatMode, string> = {
    general: `Bu test versiyasi. Tez orada haqiqiy sun'iy intellekt ulanadi. Siz yozgan matn: "${userMessage}"`,
    ielts: `Keling, IELTS ingliz tilini mashq qilamiz. Savolingiz: "${userMessage}"\n\nMen sizga yordam berish uchun tayyorman. IELTS speaking, writing va boshqa bo'limlar bo'yicha savollaringiz bo'lsa, so'rang!`,
    homework: `Uy vazifangizni bosqichma-bosqich tushuntiraman. Savolingiz: "${userMessage}"\n\nMen matematika, fizika va boshqa fanlar bo'yicha yordam beraman. Qaysi fandan yordam kerak?`,
  };

  return responses[mode];
}

/**
 * Simulates an async AI response with a delay
 */
export async function getDummyAiResponseAsync(
  mode: ChatMode,
  userMessage: string
): Promise<string> {
  // Simulate network delay (500ms - 1.5s)
  const delay = Math.random() * 1000 + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));
  
  return getDummyAiResponse(mode, userMessage);
}

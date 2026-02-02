import { ChatMode } from "@/types/chat";

/**
 * Dummy AI service for MVP v0
 * This will be replaced with real API calls in future versions
 * 
 * These responses follow Bahor AI safety guidelines:
 * - No medical diagnosis or treatment advice
 * - No legal or religious rulings
 * - No extremism, hate or violence
 * - No crime or cheating assistance
 * - Financial safety (no specific investment advice)
 * - Political neutrality
 */
export function getDummyAiResponse(mode: ChatMode, userMessage: string): string {
  const responses: Record<ChatMode, string> = {
    general: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq sun'iy intellekt ulanadi va sizning savollaringizga batafsil javob bera olaman.`,
    
    ielts: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va IELTS tayyorgarligida batafsil yordam beradi.`,
    
    homework: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va uy vazifalaringizda bosqichma-bosqich yordam beradi.`,
    
    job: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va karyera bo'yicha batafsil maslahatlar beradi.`,
    
    daily: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va kundalik hayot masalalaringizda yordam beradi.`,
    
    business: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va biznes bo'yicha batafsil maslahatlar beradi.`,
    
    tech: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va dasturlash bo'yicha batafsil yordam beradi.`,
    
    financial: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va moliyaviy savodxonlik bo'yicha umumiy maslahatlar beradi.`,
    
    health: `Siz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq AI ulanadi va sog'lom turmush tarzi bo'yicha umumiy maslahatlar beradi.`,

    teacher: `Siz yozgan: "${userMessage}"\n\n🎓 O'qituvchi rejimida men sizga mavzuni bosqichma-bosqich o'rgataman. Tez orada to'liq AI ulanadi.`,
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

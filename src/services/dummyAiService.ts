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
    general: `Assalomu alaykum! Men Bahor AI — O'zbekiston uchun yaratilgan sun'iy intellekt yordamchisiman.\n\nSiz yozgan: "${userMessage}"\n\n🔄 Bu hali test versiyasi. Tez orada to'liq sun'iy intellekt ulanadi va men sizning savollaringizga to'liq javob bera olaman.\n\nHozircha men sizga umumiy maslahatlar, o'rganish bo'yicha yordam va kundalik savollar bo'yicha yordam berishga tayyorman. Savolingizni aniqroq yozib bering!`,
    
    ielts: `Assalomu alaykum! IELTS tayyorgarligiga xush kelibsiz.\n\nSizning savolingiz: "${userMessage}"\n\n📚 Men sizga quyidagilarda yordam beraman:\n• IELTS Speaking (Part 1, 2, 3) mashqlari\n• Writing Task 1 va Task 2 strukturalari\n• Grammatika va lug'at tuzatishlari\n• Band 7+ darajasida javoblar namunasi\n\n💡 Eslatma: Men sizga o'rganishda yordam beraman, lekin imtihon topshiriqlarini to'g'ridan-to'g'ri yozib bermayman. O'zingiz yozib ko'ring, men tuzataman va takomillashtiramiz!\n\n🔄 Haqiqiy AI tez orada ulanadi va yanada samarali yordam beradi.`,
    
    homework: `Assalomu alaykum! Uy vazifangizga yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n📖 Men quyidagi fanlar bo'yicha tushuntirib bera olaman:\n• Matematika (algebra, geometriya, trigonometriya)\n• Fizika va kimyo\n• Ingliz tili\n• Boshqa maktab fanlari\n\n⚠️ Muhim: Men sizga tushunishingizga yordam beraman va bosqichma-bosqich yechim ko'rsataman, lekin to'g'ridan-to'g'ri javobni nusxalash uchun emas. Maqsad — siz o'rganishingiz!\n\nSavolingizni aniqroq yozing, birgalikda hal qilamiz.`,
    
    job: `Assalomu alaykum! Ish topish va martaba rivojlantirishda yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n💼 Men quyidagilarda yordam bera olaman:\n• Resume/CV tayyorlash va yaxshilash\n• Ish suhbatiga tayyorgarlik\n• Intervyu savollariga javoblar tayyorlash\n• Karyera yo'nalishini tanlash\n• Professional ko'nikmalar rivojlantirish\n\n💡 Maslahat: Ish topishda sabr-toqat va tayyorgarlik muhim. Resume'ingizni har bir ish uchun moslashtiring va o'zingizni ishonchli his qiling!\n\n🔄 To'liq AI tez orada ulanadi.`,
    
    daily: `Assalomu alaykum! Kundalik hayotingizni osonlashtirishga yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n🏠 Men quyidagilarda yordam bera olaman:\n• Oddiy retseptlar va ovqat pishirish maslahatlari\n• Vaqtni boshqarish va rejalashtirish\n• Uy ishlari va tartib-intizom\n• Sayohat maslahatlari\n• Kundalik muammolarni hal qilish\n\n⚠️ Eslatma: Tibbiy, huquqiy yoki diniy masalalar uchun mutaxassislarga murojaat qiling. Men faqat umumiy hayotiy maslahatlar bera olaman.\n\nAniqroq savol yozing!`,
    
    business: `Assalomu alaykum! Biznes va marketing bo'yicha yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n📈 Men quyidagilarda yordam bera olaman:\n• Biznes g'oyalarini rivojlantirish\n• Marketing strategiyalari\n• Instagram, Telegram, Facebook kontenti\n• Kichik biznesni boshlash maslahatlari\n• Brending va positioning\n\n💡 Eslatma: Har bir biznes o'ziga xos. Men umumiy maslahatlar beraman, lekin aniq moliyaviy prognoz yoki investitsiya tavsiyalari berolmayman. Katta qarorlar uchun mutaxassisga murojaat qiling.\n\n🔄 To'liq AI tez orada ulanadi va kengroq yordam beradi.`,
    
    tech: `Assalomu alaykum! Dasturlash va texnologiya bo'yicha yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n💻 Men quyidagilarda yordam bera olaman:\n• Kod tushuntirish (Python, JavaScript, TypeScript, HTML/CSS)\n• Xatolarni topish va tuzatish (debugging)\n• Algoritmlar va mantiqni tushuntirish\n• Texnologiya tanlov maslahatlari\n• Dasturlashni o'rganish yo'llari\n\n⚠️ Muhim: Men sizga o'rganishda va tushunishda yordam beraman. Zararli kod (hacking, virus, xavfsizlikni buzish) bo'yicha yordam bera olmayman.\n\nKodni yoki savolingizni batafsil yozing!`,
    
    financial: `Assalomu alaykum! Moliyaviy savodxonlik bo'yicha yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n💰 Men quyidagilarda yordam bera olaman:\n• Oylik byudjet tuzish\n• Pul tejash usullari\n• Moliyaviy maqsadlar rejalashtirish\n• Asosiy moliya tushunchalari (foiz, kredit, depozit)\n• Xarajatlarni boshqarish\n\n⚠️ Juda muhim ogohlantirish:\n• Men aniq investitsiya tavsiyalari bermayman (kripto, aksiyalar, forex)\n• Daromad kafolati bermayman\n• Aniq moliyaviy mahsulot yoki bankni tavsiya qilmayman\n• Katta moliyaviy qarorlar uchun malakali moliyaviy maslahatchiga murojaat qiling\n\nMoliya — mas'uliyatli mavzu. Men faqat umumiy bilim va oddiy maslahatlar beraman. Savolingizni yozing!`,
    
    health: `Assalomu alaykum! Sog'lom turmush tarzi bo'yicha yordam berishga tayyorman.\n\nSiz yozgan: "${userMessage}"\n\n💪 Men quyidagilarda yordam bera olaman:\n• Umumiy jismoniy mashqlar va cho'zish\n• Sog'lom ovqatlanish odatlari\n• Uyqu va dam olish maslahatlari\n• Suv ichish va oddiy gigiyena\n• Stress bilan kurashish usullari\n\n🚨 JUDA MUHIM OGOHLANTIRISH:\n• Men shifokor EMASMAN va tibbiy tashxis qo'ya OLMAYMAN\n• Dori-darmon tavsiya qila OLMAYMAN\n• Og'riq, kasallik belgilari bo'lsa — darhol shifokorga boring!\n• Jiddiy alomatlar bo'lsa — tez tibbiy yordam chaqiring!\n\nMen faqat umumiy sog'lom turmush maslahatlari beraman. Tibbiy masalalar uchun albatta shifokorga murojaat qiling!\n\nOddiy turmush tarzi maslahati kerakmi?`,
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

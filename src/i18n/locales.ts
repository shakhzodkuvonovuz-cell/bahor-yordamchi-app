export type Lang = 'uz' | 'en' | 'ru' | 'tr';

export const translations: Record<Lang, Record<string, string>> = {
  uz: {
    // App
    'app.name': 'Bahor AI',
    'app.tagline.main': "Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun.",
    'app.tagline.sub': "O'zbek tili va madaniyati uchun maxsus yaratilgan chaqqon sun'iy intellekt yordamchi.",
    
    // Header & Navigation
    'nav.home': 'Bosh sahifa',
    'nav.features': 'Imkoniyatlar',
    'nav.pricing': 'Narxlar',
    'nav.blog': 'Blog',
    'button.openApp': "Bahor AI'ni ochish",
    'button.learnMore': "Batafsil ma'lumot",
    'button.start': 'Boshlash',
    'button.startUsing': "Bahor AI'dan foydalanish",
    'button.comingSoon': 'Tez orada',
    
    // Hero Section
    'badge.beta': 'Hozircha beta',
    'label.freeDuringBeta': 'Hozircha beta davrida bepul foydalanish mumkin.',
    
    // Features Section
    'section.whyChoose': 'Nega aynan Bahor AI?',
    'section.whyChoose.subtitle': "O'zbek tilida so'zlashuvchilar ehtiyojlari uchun maxsus yaratilgan",
    'feature.uzbekOptimized.title': "O'zbek tiliga moslashtirilgan",
    'feature.uzbekOptimized.desc': "O'zbek shevasi, tabiiy iboralar va haqiqiy kontekstni tushunadi.",
    'feature.affordable.title': 'Arzon narxlar',
    'feature.affordable.desc': "Xorijiy AI xizmatlaridan 80% arzonroq. O'zbekiston uchun moslashtirilgan narxlar.",
    'feature.specializedModes.title': 'Maxsus rejimlar',
    'feature.specializedModes.desc': 'Kod yozish, IELTS, biznes, marketing, uy vazifasi va boshqalar.',
    'feature.fastSimple.title': 'Tez, oddiy, qulay',
    'feature.fastSimple.desc': "Murakkab menyular yo'q. Shunchaki so'rang va tezkor yordam oling.",
    'feature.futurePlans.title': 'Kelajakda premium rejalar',
    'feature.futurePlans.desc': "Hozircha beta davrida bepul. Pullik rejalar tez orada qo'shimcha imkoniyatlar bilan ishga tushadi.",
    
    // Built For Section
    'builtFor.badge': "O'zbekiston uchun",
    'builtFor.title': "O'zbekiston uchun maxsus yaratilgan",
    'builtFor.description': "Bahor AI o'zbek tili, madaniyati va mahalliy ehtiyojlarni tushunadi. Biz o'zbek tilida so'zlashuvchilar uchun eng yaxshi AI tajribasini yaratmoqdamiz.",
    
    // Mockup
    'mockup.userMessage': "Ingliz tilida essay yozishga yordam bering",
    'mockup.aiMessage': "Albatta! Essay mavzusi nima bo'ladi?",
    
    // Modes Section
    'section.exploreModes': 'Bahor AI rejimlarini kashf qiling',
    'section.exploreModes.subtitle': 'Har bir ehtiyoj uchun maxsus AI yordamchilar',
    'mode.general.title': 'Umumiy suhbat',
    'mode.general.desc': 'Har qanday savol va suhbat uchun universal yordamchi.',
    'mode.tech.title': 'Texnologiya va kod',
    'mode.tech.desc': 'Dasturlash, xatolarni tuzatish va texnik savollarda yordam.',
    'mode.life.title': 'Hayotiy yordam',
    'mode.life.desc': 'Kundalik hayot, retseptlar va kundalik vazifalar uchun amaliy maslahatlar.',
    'mode.business.title': 'Biznes va marketing',
    'mode.business.desc': 'Biznes rivojlantirish va marketing kampaniyalari uchun strategik maslahatlar.',
    'mode.english.title': 'Ingliz tili va IELTS',
    'mode.english.desc': "Ingliz tilini yaxshilash va IELTS imtihoniga tayyorlanish.",
    'mode.homework.title': 'Uy vazifasi va fanlar',
    'mode.homework.desc': 'Maktab vazifalari va o\'quv fanlari bo\'yicha yordam.',
    'mode.job.title': 'Ish va rezyume',
    'mode.job.desc': 'Professional rezyume yozish va suhbatga tayyorlanish.',
    'mode.finance.title': 'Moliyaviy savodxonlik',
    'mode.finance.desc': 'Byudjet tuzish, tejash va moliyaviy rejalashtirish haqida.',
    'mode.health.title': "Sog'liq va fitness",
    'mode.health.desc': "Salomatlik, ovqatlanish va sog'lom hayot tarzi bo'yicha maslahatlar.",
    
    // How It Works Section
    'section.howItWorks': 'Bahor AI qanday ishlaydi',
    'section.howItWorks.subtitle': 'Uchta oddiy qadamda boshlang',
    'step.1.title': 'Har qanday savol bering',
    'step.1.desc': "Maktab vazifalaridan tortib retseptlargacha, kod yozishgacha.",
    'step.2.title': 'Rejim tanlang (ixtiyoriy)',
    'step.2.desc': 'Maxsus rejim tanlash orqali aniqroq javoblar oling.',
    'step.3.title': "Suhbatni davom ettiring",
    'step.3.desc': 'Aniqlang, tuzating yoki qo\'shimcha savollar bering.',
    
    // Pricing Section
    'section.pricing': 'Narxlar',
    'section.pricing.subtitle': "O'zingizga mos rejani tanlang",
    'pricing.free.name': 'Bepul (beta)',
    'pricing.free.desc': "Boshlang'ich foydalanish uchun",
    'pricing.free.feature1': 'Kuniga 5 ta xabar',
    'pricing.free.feature2': 'Asosiy suhbat rejimi',
    'pricing.free.feature3': 'Cheklangan funksiyalar',
    'pricing.monthly.name': 'Oylik reja',
    'pricing.monthly.desc': 'Professional foydalanuvchilar uchun',
    'pricing.monthly.feature1': 'Cheksiz xabarlar',
    'pricing.monthly.feature2': 'Barcha maxsus rejimlar',
    'pricing.monthly.feature3': 'Fayl va rasm tahlili',
    'pricing.monthly.feature4': 'Tezkor javoblar',
    'pricing.monthly.badge': 'Eng mashhur',
    'pricing.yearly.name': 'Yillik reja',
    'pricing.yearly.desc': 'Maksimal tejash',
    'pricing.yearly.feature1': 'Barcha oylik reja imkoniyatlari',
    'pricing.yearly.feature2': '42% tejash',
    'pricing.yearly.feature3': "Birinchi bo'lib yangi funksiyalar",
    'pricing.yearly.badge': 'Eng tejamkor',
    'pricing.currency': 'UZS',
    'pricing.comparison': "ChatGPT'dan 5 baravar arzon, tezroq javoblar bilan.",
    
    // FAQ Section
    'section.faq': "Ko'p beriladigan savollar",
    'section.faq.subtitle': 'Bahor AI haqida umumiy savollar',
    'faq.1.question': 'Bahor AI ChatGPT bilan bir xilmi?',
    'faq.1.answer': "Yo'q. Bahor AI o'zbek foydalanuvchilari, mahalliy madaniyat va mahalliy ehtiyojlar uchun moslashtirilgan.",
    'faq.2.question': 'Nega Bahor AI hozir bepul?',
    'faq.2.answer': "Biz beta davrida fikr-mulohazalarni yig'ib, xizmatni yaxshilayapmiz.",
    'faq.3.question': 'Bahor AI qaysi tillarni qo\'llab-quvvatlaydi?',
    'faq.3.answer': "Asosiy til - o'zbekcha. Ingliz va rus tillari ham tushuniladi.",
    'faq.4.question': "Ma'lumotlarim xavfsizmi?",
    'faq.4.answer': "Ha. Shaxsiy ma'lumotlar uchinchi tomonlar bilan ulashilmaydi. Maxfiylik siyosatimizni ko'ring.",
    
    // Footer
    'footer.rights': '© 2024 Bahor AI. Barcha huquqlar himoyalangan.',
    
    // Language
    'lang.uz': "O'zbekcha",
    'lang.en': 'English',
    'lang.ru': 'Русский',
    'lang.tr': 'Türkçe',
    'lang.choose': 'Tilni tanlang',
    
    // Chat Page
    'chat.title.general': 'Umumiy suhbat',
    'chat.subtitle.general': 'Har qanday savol va suhbat uchun',
    'chat.dailyLimit': "Bugungi limit: {used} / {max} so'rov",
    'chat.input.placeholder': "Savolingizni yozing...",
    'chat.attach.tooltip': 'Fayl yoki rasm yuklash',
    'chat.clear': 'Suhbatni tozalash',
    'chat.newChat': 'Yangi suhbat',
    'chat.history': 'Suhbat tarixi',
    'chat.typing': 'Bahor AI yozmoqda...',
    'chat.send': 'Yuborish',
    
    // Daily Usage
    'usage.today': "Bugungi limit",
    'usage.requests': "so'rov",
    'usage.limitReached': "Bugungi bepul limit tugadi",
    'usage.limitReached.desc': "Bahor AI'ni to'liq ishlatish uchun Premium rejaga o'ting. Cheksiz suhbat, fayl va rasm tahlili, maxsus rejimlar va tezkor javoblar siz uchun ochiladi.",
    'usage.upgradeToPremium': "Premiumga o'tish",
    'usage.continueTomorrow': 'Ertaga davom ettiraman',
    
    // Delete Modal
    'delete.title': "Suhbat o'chirilsinmi?",
    'delete.description': "Bu suhbatni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.",
    'delete.cancel': "Bekor qilish",
    'delete.confirm': "O'chirish",
    
    // Thinking Bar
    'thinking.reasoning': "Chuqur o'ylanmoqda...",
    'thinking.searching': "Internetdan ma'lumot qidirmoqda...",
    'thinking.vision': "Tahlil qilinmoqda...",
    'thinking.finalising': "Javob tayyorlanmoqda...",
    'thinking.slow': "Chuqurroq tahlil qilinmoqda...",
    'thinking.almostDone': "Deyarli tayyor",
    'thinking.seconds': "soniya",
    'thinking.fewMoreSeconds': "Yana bir oz...",
    'thinking.showReasoning': "To'liq fikrlashni ko'rsatish",
    'thinking.hideReasoning': "Fikrlashni yashirish",
    'thinking.deepReasoning': "🧠 Chuqur fikrlash faol",
    'thinking.clickToExpand': "(bosib kengaytiring)",
    'thinking.sourcesUsed': "Foydalanilgan manbalar",
    'thinking.reasoningProcess': "Fikrlash jarayoni",
    
    // General steps
    'thinking.step.understanding': "Savolingizni tahlil qilmoqda",
    'thinking.step.selecting': "Kerakli manbalarni tanlamoqda",
    'thinking.step.drafting': "Javobni tuzmoqda",
    'thinking.step.checking': "Javobni tekshirmoqda",
    'thinking.processing': "Fikr yuritilmoqda...",
    'thinking.explanation': "Ba'zan chuqur fikrlash yoki vebdan ma'lumot izlash biroz ko'proq vaqt olishi mumkin. Bu sizga aniqroq va ishonchli javob berish uchun qilinadi.",
    
    // Coding steps
    'thinking.step.coding.analyzing': "Kod strukturasini tahlil qilmoqda",
    'thinking.step.coding.patterns': "Eng yaxshi pattern'larni tanlamoqda",
    'thinking.step.coding.solution': "Yechimni ishlab chiqmoqda",
    'thinking.step.coding.optimizing': "Kodni optimizatsiya qilmoqda",
    
    // Translation steps
    'thinking.step.translation.understanding': "Asl matnni o'qimoqda",
    'thinking.step.translation.context': "Kontekstni tahlil qilmoqda",
    'thinking.step.translation.adapting': "Tilga moslashmoqda",
    'thinking.step.translation.polishing': "Tarjimani silliqlashmoqda",
    
    // Essay steps
    'thinking.step.essay.analyzing': "Mavzuni tahlil qilmoqda",
    'thinking.step.essay.structuring': "Tuzilmani rejalashtirmoqda",
    'thinking.step.essay.writing': "Matnni yozmoqda",
    'thinking.step.essay.reviewing': "Matnni ko'rib chiqmoqda",
    
    // Math steps
    'thinking.step.math.parsing': "Masalani tahlil qilmoqda",
    'thinking.step.math.method': "Yechish usulini tanlamoqda",
    'thinking.step.math.calculating': "Hisoblamoqda",
    'thinking.step.math.verifying': "Javobni tekshirmoqda",
    
    // Search steps
    'thinking.step.searching.query': "Qidiruv so'rovini tuzmoqda",
    'thinking.step.searching.sources': "Ishonchli manbalarni qidirmoqda",
    'thinking.step.searching.analyzing': "Topilgan ma'lumotlarni tahlil qilmoqda",
    'thinking.step.searching.compiling': "Javobni jamlashmoqda",
    
    // Vision steps
    'thinking.step.vision.scanning': "Rasmni skanerlashmoqda",
    'thinking.step.vision.recognizing': "Ob'ektlarni aniqlashmoqda",
    'thinking.step.vision.understanding': "Mazmunini tushunmoqda",
    'thinking.step.vision.formulating': "Javobni tayyorlashmoqda",
    
    // Reasoning explanations
    'thinking.reason.step1': "Bu qadam savolingizni to'liq tushunish uchun kerak.",
    'thinking.reason.step2': "Eng ishonchli va dolzarb ma'lumotlarni tanlaymiz.",
    'thinking.reason.step3': "Sizga tushunarli va aniq javob tayyorlaymiz.",
    'thinking.reason.step4': "Javobni xatolardan tekshirib, tasdiqlaymiz.",
    
    // Voice Mode
    'voice.startVoice': "Ovozli rejim",
    'voice.listening': "Tinglayapman...",
    'voice.understanding': "Ovozingizni tushunmoqda...",
    'voice.preparing': "Javob tayyorlanmoqda...",
    'voice.tapToSpeak': "Gapirish uchun bosing",
    'voice.speakNaturally': "Tabiiy gapiring. Bahor AI tinglayapti.",
    'voice.processingVoice': "Ovozingiz tahlil qilinmoqda",
    'voice.almostReady': "Deyarli tayyor",
    'voice.readyToListen': "Tinglashga tayyor",
    'voice.tapToStop': "To'xtatish uchun bosing",
    'voice.tapToStart': "Boshlash uchun bosing",
    'voice.cancel': "Bekor qilish",
    'voice.replay': "Qayta tinglash",
    'voice.toggleCaptions': "Subtitrlar",
    'voice.toggleMute': "Ovozni o'chirish",
    'voice.step.transcribing': "Nutqni matnga aylantirilmoqda",
    'voice.step.analyzing': "Maqsadni tahlil qilmoqda",
    'voice.step.preparing': "Javob tayyorlanmoqda",
    'voice.demo.greeting': "Salom, bugun menga qanday yordam bera olasiz?",
    'voice.demo.question': "Ingliz tilida essay yozishga yordam bering",
    'voice.demo.answer': "Albatta! Essay mavzusi nima bo'ladi? Men sizga tuzilma, kirish, asosiy qism va xulosa yozishda yordam beraman.",
    'voice.switchToText': "Matn rejimi",
    // Voice Mode States
    'voice.state.listening': "Tinglayapman...",
    'voice.state.listening.sub': "Tabiiy gapiring. Bahor AI tinglayapti.",
    'voice.state.thinking': "O'ylamoqda...",
    'voice.state.thinking.sub': "Savolingizni tahlil qilyapman.",
    'voice.state.speaking': "Javob beryapman...",
    'voice.state.speaking.sub': "Iltimos kuting.",
    
    // Settings Page
    'settings.title': 'Sozlamalar',
    'settings.back': 'Orqaga',
    'settings.edit': 'Tahrirlash',
    'settings.logout': 'Chiqish',
    'settings.notifications': 'Bildirishnomalar',
    'settings.news': 'Yangiliklar',
    'settings.newsDesc': 'Yangi funksiyalar',
    'settings.tips': 'Maslahatlar',
    'settings.tipsDesc': "Foydali g'oyalar",
    'settings.discounts': 'Chegirmalar',
    'settings.discountsDesc': 'Maxsus takliflar',
    'settings.experience': 'Bahor AI tajribasi',
    'settings.animations': 'Animatsiyalar',
    'settings.animationsDesc': 'Interfeys effektlari',
    'settings.smartSuggestions': 'Aqlli takliflar',
    'settings.smartSuggestionsDesc': 'Tavsiya etilgan savollar',
    'settings.security': 'Xavfsizlik',
    'settings.changePassword': "Parolni o'zgartirish",
    'settings.logoutAllDevices': 'Barcha qurilmalardan chiqish',
    'settings.appSettings': 'Ilova sozlamalari',
    'settings.language': 'Til',
    'settings.theme': 'Mavzu',
    'settings.themeLight': "Yorug'",
    'settings.themeDark': "Qorong'i",
    'settings.subscription': 'Obuna holati',
    'settings.helpLegal': 'Yordam va huquqiy',
    'settings.helpCenter': 'Yordam markazi',
    'settings.reportBug': 'Xatolik haqida xabar berish',
    'settings.terms': 'Foydalanish shartlari',
    'settings.privacy': 'Maxfiylik siyosati',
    'settings.viewAllPlans': "Barcha rejalar va narxlarni ko'rish →",
    'settings.usageToday': 'Bugungi foydalanish',
    'settings.plan': 'rejasi',
    'settings.unlimited': 'Cheksiz',
    'settings.comingSoon': "Bu funksiya tez orada qo'shiladi",
    'settings.logoutSuccess': 'Barcha qurilmalardan chiqdingiz',
    'settings.error': 'Xatolik yuz berdi',
    'settings.logoutError': 'Chiqishda xatolik yuz berdi',
    'settings.user': 'Foydalanuvchi',
    'settings.free': 'Bepul',
    'settings.premium': 'Premium',
    'settings.ultra': 'Ultra',
    'settings.devUnlimited': 'Dev Unlimited',
    
    // Modes Page
    'modes.title': 'Bahor AI',
    'modes.question': 'Bugun nimaga yordam kerak?',
    'modes.subtitle': 'Bahor AI sizga turli sohalarda yordam beradi',
    'modes.primary': 'Asosiy imkoniyatlar',
    'modes.learning': "O'qish va rivojlanish",
    
    // Feedback Page
    'feedback.title': 'Fikr bildirish',
    'feedback.type': 'Turi',
    'feedback.bug': 'Xatolik',
    'feedback.idea': 'Taklif',
    'feedback.other': 'Boshqa',
    'feedback.message': 'Xabar',
    'feedback.messagePlaceholder.bug': 'Qanday xatolik yuz berdi? Qadam-baqadam tushuntiring...',
    'feedback.messagePlaceholder.idea': 'Taklifingizni batafsil yozing...',
    'feedback.messagePlaceholder.other': 'Xabaringizni yozing...',
    'feedback.screenshot': 'Skrinshot (ixtiyoriy)',
    'feedback.addImage': "Rasm qo'shish",
    'feedback.submit': 'Yuborish',
    'feedback.thanks': 'Sizning fikringiz Bahor AI ni yaxshilashga yordam beradi. Rahmat!',
    'feedback.success': 'Yuborildi, rahmat! 🙏',
    'feedback.error': 'Xatolik yuz berdi. Qayta urinib ko\'ring.',
    'feedback.emptyMessage': 'Iltimos, xabaringizni yozing',
    'feedback.imageTooLarge': "Rasm 5MB dan kichik bo'lishi kerak",
    
    // Beta Banner
    'beta.title': 'Beta versiya',
    'beta.description': "Xatolar bo'lishi mumkin. Feedback juda kerak —",
    'beta.report': 'xabar bering',
    
    // Terms Page
    'terms.title': 'Foydalanish shartlari',
    'terms.lastUpdated': 'Oxirgi yangilanish: 2025-yil, yanvar',
    
    // Privacy Page
    'privacy.title': 'Maxfiylik siyosati',
    'privacy.lastUpdated': 'Oxirgi yangilanish: 2025-yil, yanvar',
    
    // Support Page
    'support.title': 'Yordam',
    'support.contact': "Bog'lanish",
    'support.contactDesc': 'Savollaringiz uchun',
    'support.email': 'Elektron pochta',
    'support.reportBug': 'Xatolik haqida xabar berish',
    'support.reportBugDesc': 'Muammolarni hal qilishga yordam bering',
    'support.sendBug': 'Xatolik yuborish',
    'support.howToReport': 'Qanday xatolik yuborish kerak?',
    'support.step1': 'Sozlamalar → "Xatolik haqida xabar berish" tugmasini bosing',
    'support.step2': 'Xatolik turini tanlang (bug, taklif yoki boshqa)',
    'support.step3': 'Muammoni batafsil tushuntiring. Iloji bo\'lsa, skrinshot qo\'shing.',
    'support.step4': 'Yuborish tugmasini bosing. Biz tez orada ko\'rib chiqamiz!',
    'support.faqComingSoon': 'FAQ va qo\'llanmalar tez orada qo\'shiladi',
    
    // Common
    'common.back': 'Orqaga',
  },

  en: {
    // App
    'app.name': 'Bahor AI',
    'app.tagline.main': 'The first Uzbek artificial intelligence — made for Uzbeks.',
    'app.tagline.sub': 'A lightning-fast AI assistant designed for the Uzbek language and culture.',
    
    // Header & Navigation
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.blog': 'Blog',
    'button.openApp': 'Open Bahor AI',
    'button.learnMore': 'Learn more',
    'button.start': 'Get Started',
    'button.startUsing': 'Start using Bahor AI',
    'button.comingSoon': 'Coming Soon',
    
    // Hero Section
    'badge.beta': 'Currently in Beta',
    'label.freeDuringBeta': 'Currently available for free during beta.',
    
    // Features Section
    'section.whyChoose': 'Why choose Bahor AI?',
    'section.whyChoose.subtitle': 'Built specifically for the needs of Uzbek speakers',
    'feature.uzbekOptimized.title': 'Optimized for Uzbek language',
    'feature.uzbekOptimized.desc': 'Understands Uzbek slang, natural phrasing, and real-life context.',
    'feature.affordable.title': 'Affordable pricing',
    'feature.affordable.desc': '80% cheaper than foreign AI services. Pricing optimized for Uzbekistan.',
    'feature.specializedModes.title': 'Specialized modes',
    'feature.specializedModes.desc': 'Coding, IELTS, business, marketing, homework help, and more.',
    'feature.fastSimple.title': 'Fast, simple, intuitive',
    'feature.fastSimple.desc': 'No complicated menus. Just ask and get instant help.',
    'feature.futurePlans.title': 'Future premium plans',
    'feature.futurePlans.desc': 'Currently free in beta. Paid plans will launch soon with additional features.',
    
    // Built For Section
    'builtFor.badge': 'For Uzbekistan',
    'builtFor.title': 'Built specifically for Uzbekistan',
    'builtFor.description': 'Bahor AI understands Uzbek language, culture, and local needs. We are creating the best AI experience for Uzbek speakers.',
    
    // Mockup
    'mockup.userMessage': 'Help me write an essay in English',
    'mockup.aiMessage': 'Of course! What topic would you like?',
    
    // Modes Section
    'section.exploreModes': 'Explore Bahor AI Modes',
    'section.exploreModes.subtitle': 'Specialized AI assistants for every need',
    'mode.general.title': 'General Chat',
    'mode.general.desc': 'A universal assistant for any questions and conversations.',
    'mode.tech.title': 'Technology & Coding',
    'mode.tech.desc': 'Get help with programming, debugging, and technical questions.',
    'mode.life.title': 'Life Assistance',
    'mode.life.desc': 'Practical advice for everyday life, recipes, and daily tasks.',
    'mode.business.title': 'Business & Marketing',
    'mode.business.desc': 'Strategic guidance for business growth and marketing campaigns.',
    'mode.english.title': 'English & IELTS',
    'mode.english.desc': 'Improve your English skills and prepare for IELTS exams.',
    'mode.homework.title': 'Homework & Subjects',
    'mode.homework.desc': 'Get help with school assignments and academic subjects.',
    'mode.job.title': 'Job & Resume',
    'mode.job.desc': 'Build professional resumes and prepare for job interviews.',
    'mode.finance.title': 'Financial Literacy',
    'mode.finance.desc': 'Learn about budgeting, saving, and financial planning.',
    'mode.health.title': 'Health & Fitness',
    'mode.health.desc': 'Get advice on wellness, nutrition, and healthy living.',
    
    // How It Works Section
    'section.howItWorks': 'How Bahor AI Works',
    'section.howItWorks.subtitle': 'Get started in three simple steps',
    'step.1.title': 'Ask anything',
    'step.1.desc': 'From school assignments to recipes to coding help.',
    'step.2.title': 'Choose a mode (optional)',
    'step.2.desc': 'Get more precise answers by selecting a specialized mode.',
    'step.3.title': 'Continue the conversation',
    'step.3.desc': 'Refine, adjust, or ask follow-up questions instantly.',
    
    // Pricing Section
    'section.pricing': 'Pricing',
    'section.pricing.subtitle': 'Choose the plan that works best for you',
    'pricing.free.name': 'Free (beta)',
    'pricing.free.desc': 'For getting started',
    'pricing.free.feature1': '5 messages per day',
    'pricing.free.feature2': 'Basic chat mode',
    'pricing.free.feature3': 'Limited features',
    'pricing.monthly.name': 'Monthly Plan',
    'pricing.monthly.desc': 'For professional users',
    'pricing.monthly.feature1': 'Unlimited messages',
    'pricing.monthly.feature2': 'All specialized modes',
    'pricing.monthly.feature3': 'File and image analysis',
    'pricing.monthly.feature4': 'Faster responses',
    'pricing.monthly.badge': 'Most Popular',
    'pricing.yearly.name': 'Yearly Plan',
    'pricing.yearly.desc': 'Maximum savings',
    'pricing.yearly.feature1': 'All monthly plan features',
    'pricing.yearly.feature2': '42% savings',
    'pricing.yearly.feature3': 'Early access to new features',
    'pricing.yearly.badge': 'Best Value',
    'pricing.currency': 'UZS',
    'pricing.comparison': 'Up to 5× cheaper than ChatGPT with faster responses.',
    
    // FAQ Section
    'section.faq': 'Frequently Asked Questions',
    'section.faq.subtitle': 'Common questions about Bahor AI',
    'faq.1.question': 'Is Bahor AI the same as ChatGPT?',
    'faq.1.answer': 'No. Bahor AI is customized for Uzbek users, local culture, and local use cases.',
    'faq.2.question': 'Why is Bahor AI free right now?',
    'faq.2.answer': 'We are in beta, collecting feedback and improving the service.',
    'faq.3.question': 'What languages does Bahor AI support?',
    'faq.3.answer': 'Primary language is Uzbek. English and Russian are also understood.',
    'faq.4.question': 'Is my data safe?',
    'faq.4.answer': 'Yes. No personal data is shared with third parties. See our privacy policy.',
    
    // Footer
    'footer.rights': '© 2024 Bahor AI. All rights reserved.',
    
    // Language
    'lang.uz': 'Uzbek',
    'lang.en': 'English',
    'lang.ru': 'Russian',
    'lang.tr': 'Turkish',
    'lang.choose': 'Choose language',
    
    // Chat Page
    'chat.title.general': 'General chat',
    'chat.subtitle.general': 'Ask anything or just talk',
    'chat.dailyLimit': "Today's limit: {used} / {max} messages",
    'chat.input.placeholder': 'Type your question...',
    'chat.attach.tooltip': 'Upload file or image',
    'chat.clear': 'Clear chat',
    'chat.newChat': 'New chat',
    'chat.history': 'Chat history',
    'chat.typing': 'Bahor AI is typing...',
    'chat.send': 'Send',
    
    // Daily Usage
    'usage.today': "Today's limit",
    'usage.requests': 'messages',
    'usage.limitReached': "Today's free limit reached",
    'usage.limitReached.desc': 'Upgrade to Premium to use Bahor AI without limits. Get unlimited conversations, file and image analysis, specialized modes, and faster responses.',
    'usage.upgradeToPremium': 'Upgrade to Premium',
    'usage.continueTomorrow': "I'll continue tomorrow",
    
    // Delete Modal
    'delete.title': 'Delete this chat?',
    'delete.description': 'Are you sure you want to delete this chat? This action cannot be undone.',
    'delete.cancel': 'Cancel',
    'delete.confirm': 'Delete',
    
    // Thinking Bar
    'thinking.reasoning': "Thinking deeply...",
    'thinking.searching': "Searching the web...",
    'thinking.vision': "Analyzing...",
    'thinking.finalising': "Preparing your answer...",
    'thinking.slow': "Running deeper analysis...",
    'thinking.almostDone': "Almost done",
    'thinking.seconds': "seconds",
    'thinking.fewMoreSeconds': "A few more seconds...",
    'thinking.showReasoning': "Show full reasoning",
    'thinking.hideReasoning': "Hide reasoning",
    'thinking.deepReasoning': "🧠 Deep reasoning active",
    'thinking.clickToExpand': "(click to expand)",
    'thinking.sourcesUsed': "Sources used",
    'thinking.reasoningProcess': "Reasoning process",
    
    // General steps
    'thinking.step.understanding': "Analyzing your question",
    'thinking.step.selecting': "Selecting relevant sources",
    'thinking.step.drafting': "Composing the answer",
    'thinking.step.checking': "Verifying the response",
    'thinking.processing': "Thinking...",
    'thinking.explanation': "Sometimes Bahor AI takes a few more seconds to reason deeply or check fresh web sources so that your answer is more accurate.",
    
    // Coding steps
    'thinking.step.coding.analyzing': "Analyzing code structure",
    'thinking.step.coding.patterns': "Selecting best patterns",
    'thinking.step.coding.solution': "Developing solution",
    'thinking.step.coding.optimizing': "Optimizing code",
    
    // Translation steps
    'thinking.step.translation.understanding': "Reading source text",
    'thinking.step.translation.context': "Analyzing context",
    'thinking.step.translation.adapting': "Adapting to target language",
    'thinking.step.translation.polishing': "Polishing translation",
    
    // Essay steps
    'thinking.step.essay.analyzing': "Analyzing the topic",
    'thinking.step.essay.structuring': "Planning structure",
    'thinking.step.essay.writing': "Writing content",
    'thinking.step.essay.reviewing': "Reviewing text",
    
    // Math steps
    'thinking.step.math.parsing': "Parsing the problem",
    'thinking.step.math.method': "Selecting approach",
    'thinking.step.math.calculating': "Calculating",
    'thinking.step.math.verifying': "Verifying answer",
    
    // Search steps
    'thinking.step.searching.query': "Building search query",
    'thinking.step.searching.sources': "Finding reliable sources",
    'thinking.step.searching.analyzing': "Analyzing results",
    'thinking.step.searching.compiling': "Compiling answer",
    
    // Vision steps
    'thinking.step.vision.scanning': "Scanning image",
    'thinking.step.vision.recognizing': "Recognizing objects",
    'thinking.step.vision.understanding': "Understanding content",
    'thinking.step.vision.formulating': "Formulating response",
    
    // Reasoning explanations
    'thinking.reason.step1': "This step ensures we fully understand your question.",
    'thinking.reason.step2': "We select the most reliable and relevant information.",
    'thinking.reason.step3': "We prepare a clear and accurate answer for you.",
    'thinking.reason.step4': "We verify the answer for accuracy and completeness.",
    
    // Voice Mode
    'voice.startVoice': "Voice mode",
    'voice.listening': "Listening...",
    'voice.understanding': "Understanding your voice...",
    'voice.preparing': "Preparing your answer...",
    'voice.tapToSpeak': "Tap to speak",
    'voice.speakNaturally': "Speak naturally. Bahor AI is listening.",
    'voice.processingVoice': "Processing your voice",
    'voice.almostReady': "Almost ready",
    'voice.readyToListen': "Ready to listen",
    'voice.tapToStop': "Tap to stop",
    'voice.tapToStart': "Tap to start",
    'voice.cancel': "Cancel",
    'voice.replay': "Replay",
    'voice.toggleCaptions': "Captions",
    'voice.toggleMute': "Mute",
    'voice.step.transcribing': "Transcribing speech",
    'voice.step.analyzing': "Analyzing intent",
    'voice.step.preparing': "Preparing answer",
    'voice.demo.greeting': "Hello, how can you help me today?",
    'voice.demo.question': "Help me write an essay in English",
    'voice.demo.answer': "Of course! What topic would you like? I can help you with structure, introduction, body paragraphs, and conclusion.",
    'voice.switchToText': "Text mode",
    // Voice Mode States
    'voice.state.listening': "Listening...",
    'voice.state.listening.sub': "Speak naturally. Bahor AI is listening.",
    'voice.state.thinking': "Thinking...",
    'voice.state.thinking.sub': "Analyzing your question.",
    'voice.state.speaking': "Answering...",
    'voice.state.speaking.sub': "Please wait.",
    
    // Settings Page
    'settings.title': 'Settings',
    'settings.back': 'Back',
    'settings.edit': 'Edit',
    'settings.logout': 'Logout',
    'settings.notifications': 'Notifications',
    'settings.news': 'News',
    'settings.newsDesc': 'New features',
    'settings.tips': 'Tips',
    'settings.tipsDesc': 'Useful ideas',
    'settings.discounts': 'Discounts',
    'settings.discountsDesc': 'Special offers',
    'settings.experience': 'Bahor AI Experience',
    'settings.animations': 'Animations',
    'settings.animationsDesc': 'Interface effects',
    'settings.smartSuggestions': 'Smart suggestions',
    'settings.smartSuggestionsDesc': 'Recommended questions',
    'settings.security': 'Security',
    'settings.changePassword': 'Change password',
    'settings.logoutAllDevices': 'Logout from all devices',
    'settings.appSettings': 'App settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.subscription': 'Subscription status',
    'settings.helpLegal': 'Help & Legal',
    'settings.helpCenter': 'Help center',
    'settings.reportBug': 'Report a bug',
    'settings.terms': 'Terms of use',
    'settings.privacy': 'Privacy policy',
    'settings.viewAllPlans': 'View all plans and pricing →',
    'settings.usageToday': "Today's usage",
    'settings.plan': 'plan',
    'settings.unlimited': 'Unlimited',
    'settings.comingSoon': 'This feature is coming soon',
    'settings.logoutSuccess': 'Logged out from all devices',
    'settings.error': 'An error occurred',
    'settings.logoutError': 'Error while logging out',
    'settings.user': 'User',
    'settings.free': 'Free',
    'settings.premium': 'Premium',
    'settings.ultra': 'Ultra',
    'settings.devUnlimited': 'Dev Unlimited',
    
    // Modes Page
    'modes.title': 'Bahor AI',
    'modes.question': 'What do you need help with today?',
    'modes.subtitle': 'Bahor AI helps you in various areas',
    'modes.primary': 'Main features',
    'modes.learning': 'Learning & Development',
    
    // Feedback Page
    'feedback.title': 'Send Feedback',
    'feedback.type': 'Type',
    'feedback.bug': 'Bug',
    'feedback.idea': 'Suggestion',
    'feedback.other': 'Other',
    'feedback.message': 'Message',
    'feedback.messagePlaceholder.bug': 'What error occurred? Explain step by step...',
    'feedback.messagePlaceholder.idea': 'Describe your suggestion in detail...',
    'feedback.messagePlaceholder.other': 'Write your message...',
    'feedback.screenshot': 'Screenshot (optional)',
    'feedback.addImage': 'Add image',
    'feedback.submit': 'Submit',
    'feedback.thanks': 'Your feedback helps improve Bahor AI. Thank you!',
    'feedback.success': 'Sent successfully, thank you! 🙏',
    'feedback.error': 'An error occurred. Please try again.',
    'feedback.emptyMessage': 'Please write your message',
    'feedback.imageTooLarge': 'Image must be smaller than 5MB',
    
    // Beta Banner
    'beta.title': 'Beta version',
    'beta.description': 'Errors may occur. Your feedback is very important —',
    'beta.report': 'report here',
    
    // Terms Page
    'terms.title': 'Terms of Use',
    'terms.lastUpdated': 'Last updated: January 2025',
    
    // Privacy Page
    'privacy.title': 'Privacy Policy',
    'privacy.lastUpdated': 'Last updated: January 2025',
    
    // Support Page
    'support.title': 'Help',
    'support.contact': 'Contact',
    'support.contactDesc': 'For your questions',
    'support.email': 'Email',
    'support.reportBug': 'Report a bug',
    'support.reportBugDesc': 'Help us fix issues',
    'support.sendBug': 'Send bug report',
    'support.howToReport': 'How to report a bug?',
    'support.step1': 'Go to Settings → "Report a bug"',
    'support.step2': 'Select the type (bug, suggestion, or other)',
    'support.step3': 'Describe the issue in detail. Add a screenshot if possible.',
    'support.step4': 'Press Submit. We\'ll review it soon!',
    'support.faqComingSoon': 'FAQ and guides coming soon',
    
    // Common
    'common.back': 'Back',
  },

  ru: {
    // App
    'app.name': 'Bahor AI',
    'app.tagline.main': 'Первый узбекский искусственный интеллект — для узбеков.',
    'app.tagline.sub': 'Быстрый ИИ-ассистент, созданный специально для узбекского языка и культуры.',
    
    // Header & Navigation
    'nav.home': 'Главная',
    'nav.features': 'Возможности',
    'nav.pricing': 'Цены',
    'nav.blog': 'Блог',
    'button.openApp': 'Открыть Bahor AI',
    'button.learnMore': 'Узнать подробнее',
    'button.start': 'Начать',
    'button.startUsing': 'Начать использовать Bahor AI',
    'button.comingSoon': 'Скоро',
    
    // Hero Section
    'badge.beta': 'Сейчас бета-версия',
    'label.freeDuringBeta': 'В период бета-тестирования доступно бесплатно.',
    
    // Features Section
    'section.whyChoose': 'Почему именно Bahor AI?',
    'section.whyChoose.subtitle': 'Создан специально для потребностей узбекоязычных пользователей',
    'feature.uzbekOptimized.title': 'Оптимизирован для узбекского языка',
    'feature.uzbekOptimized.desc': 'Понимает узбекский сленг, естественные фразы и реальный контекст.',
    'feature.affordable.title': 'Доступные цены',
    'feature.affordable.desc': 'На 80% дешевле зарубежных AI-сервисов. Цены адаптированы для Узбекистана.',
    'feature.specializedModes.title': 'Специализированные режимы',
    'feature.specializedModes.desc': 'Программирование, IELTS, бизнес, маркетинг, помощь с домашними заданиями и многое другое.',
    'feature.fastSimple.title': 'Быстро, просто, интуитивно',
    'feature.fastSimple.desc': 'Без сложных меню. Просто спросите и получите мгновенную помощь.',
    'feature.futurePlans.title': 'Будущие премиум-планы',
    'feature.futurePlans.desc': 'Сейчас бесплатно в бете. Платные планы скоро появятся с дополнительными функциями.',
    
    // Built For Section
    'builtFor.badge': 'Для Узбекистана',
    'builtFor.title': 'Создан специально для Узбекистана',
    'builtFor.description': 'Bahor AI понимает узбекский язык, культуру и местные потребности. Мы создаём лучший AI-опыт для узбекоязычных пользователей.',
    
    // Mockup
    'mockup.userMessage': 'Помогите написать эссе на английском',
    'mockup.aiMessage': 'Конечно! Какая тема эссе?',
    
    // Modes Section
    'section.exploreModes': 'Изучите режимы Bahor AI',
    'section.exploreModes.subtitle': 'Специализированные ИИ-ассистенты для каждой потребности',
    'mode.general.title': 'Общий чат',
    'mode.general.desc': 'Универсальный помощник для любых вопросов и бесед.',
    'mode.tech.title': 'Технологии и код',
    'mode.tech.desc': 'Помощь с программированием, отладкой и техническими вопросами.',
    'mode.life.title': 'Жизненная помощь',
    'mode.life.desc': 'Практические советы для повседневной жизни, рецепты и ежедневные задачи.',
    'mode.business.title': 'Бизнес и маркетинг',
    'mode.business.desc': 'Стратегические рекомендации для развития бизнеса и маркетинговых кампаний.',
    'mode.english.title': 'Английский и IELTS',
    'mode.english.desc': 'Улучшите свой английский и подготовьтесь к экзаменам IELTS.',
    'mode.homework.title': 'Домашние задания и предметы',
    'mode.homework.desc': 'Помощь с школьными заданиями и учебными предметами.',
    'mode.job.title': 'Работа и резюме',
    'mode.job.desc': 'Создание профессиональных резюме и подготовка к собеседованиям.',
    'mode.finance.title': 'Финансовая грамотность',
    'mode.finance.desc': 'Узнайте о бюджетировании, накоплениях и финансовом планировании.',
    'mode.health.title': 'Здоровье и фитнес',
    'mode.health.desc': 'Советы по здоровью, питанию и здоровому образу жизни.',
    
    // How It Works Section
    'section.howItWorks': 'Как работает Bahor AI',
    'section.howItWorks.subtitle': 'Начните за три простых шага',
    'step.1.title': 'Задайте любой вопрос',
    'step.1.desc': 'От школьных заданий до рецептов и помощи с кодом.',
    'step.2.title': 'Выберите режим (необязательно)',
    'step.2.desc': 'Получите более точные ответы, выбрав специализированный режим.',
    'step.3.title': 'Продолжайте разговор',
    'step.3.desc': 'Уточняйте, корректируйте или задавайте дополнительные вопросы мгновенно.',
    
    // Pricing Section
    'section.pricing': 'Цены',
    'section.pricing.subtitle': 'Выберите план, который подходит именно вам',
    'pricing.free.name': 'Бесплатно (бета)',
    'pricing.free.desc': 'Для начала работы',
    'pricing.free.feature1': '5 сообщений в день',
    'pricing.free.feature2': 'Базовый режим чата',
    'pricing.free.feature3': 'Ограниченные функции',
    'pricing.monthly.name': 'Месячный план',
    'pricing.monthly.desc': 'Для профессиональных пользователей',
    'pricing.monthly.feature1': 'Безлимитные сообщения',
    'pricing.monthly.feature2': 'Все специализированные режимы',
    'pricing.monthly.feature3': 'Анализ файлов и изображений',
    'pricing.monthly.feature4': 'Быстрые ответы',
    'pricing.monthly.badge': 'Самый популярный',
    'pricing.yearly.name': 'Годовой план',
    'pricing.yearly.desc': 'Максимальная экономия',
    'pricing.yearly.feature1': 'Все функции месячного плана',
    'pricing.yearly.feature2': 'Экономия 42%',
    'pricing.yearly.feature3': 'Ранний доступ к новым функциям',
    'pricing.yearly.badge': 'Лучшая цена',
    'pricing.currency': 'UZS',
    'pricing.comparison': 'В 5 раз дешевле ChatGPT с более быстрыми ответами.',
    
    // FAQ Section
    'section.faq': 'Часто задаваемые вопросы',
    'section.faq.subtitle': 'Общие вопросы о Bahor AI',
    'faq.1.question': 'Bahor AI — это то же самое, что ChatGPT?',
    'faq.1.answer': 'Нет. Bahor AI адаптирован для узбекских пользователей, местной культуры и местных задач.',
    'faq.2.question': 'Почему Bahor AI сейчас бесплатный?',
    'faq.2.answer': 'Мы находимся в бете, собираем отзывы и улучшаем сервис.',
    'faq.3.question': 'Какие языки поддерживает Bahor AI?',
    'faq.3.answer': 'Основной язык — узбекский. Английский и русский также понимаются.',
    'faq.4.question': 'Мои данные в безопасности?',
    'faq.4.answer': 'Да. Личные данные не передаются третьим лицам. Смотрите нашу политику конфиденциальности.',
    
    // Footer
    'footer.rights': '© 2024 Bahor AI. Все права защищены.',
    
    // Language
    'lang.uz': 'Узбекский',
    'lang.en': 'Английский',
    'lang.ru': 'Русский',
    'lang.tr': 'Турецкий',
    'lang.choose': 'Выберите язык',
    
    // Chat Page
    'chat.title.general': 'Общий чат',
    'chat.subtitle.general': 'Задавайте любые вопросы',
    'chat.dailyLimit': 'Лимит на сегодня: {used} / {max} сообщений',
    'chat.input.placeholder': 'Напишите свой вопрос...',
    'chat.attach.tooltip': 'Загрузить файл или изображение',
    'chat.clear': 'Очистить чат',
    'chat.newChat': 'Новый чат',
    'chat.history': 'История чатов',
    'chat.typing': 'Bahor AI печатает...',
    'chat.send': 'Отправить',
    
    // Daily Usage
    'usage.today': 'Лимит на сегодня',
    'usage.requests': 'сообщений',
    'usage.limitReached': 'Бесплатный лимит на сегодня исчерпан',
    'usage.limitReached.desc': 'Перейдите на Premium, чтобы использовать Bahor AI без ограничений. Безлимитные разговоры, анализ файлов и изображений, специальные режимы и быстрые ответы.',
    'usage.upgradeToPremium': 'Перейти на Premium',
    'usage.continueTomorrow': 'Продолжу завтра',
    
    // Delete Modal
    'delete.title': 'Удалить этот чат?',
    'delete.description': 'Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.',
    'delete.cancel': 'Отмена',
    'delete.confirm': 'Удалить',
    
    // Thinking Bar
    'thinking.reasoning': "Глубоко размышляю...",
    'thinking.searching': "Ищу в интернете...",
    'thinking.vision': "Анализирую...",
    'thinking.finalising': "Готовлю ответ...",
    'thinking.slow': "Проводится глубокий анализ...",
    'thinking.almostDone': "Почти готово",
    'thinking.seconds': "секунд",
    'thinking.fewMoreSeconds': "Ещё немного...",
    'thinking.showReasoning': "Показать полный ход мысли",
    'thinking.hideReasoning': "Скрыть ход мысли",
    'thinking.deepReasoning': "🧠 Глубокое рассуждение активно",
    'thinking.clickToExpand': "(нажмите для расширения)",
    'thinking.sourcesUsed': "Использованные источники",
    'thinking.reasoningProcess': "Процесс рассуждения",
    
    // General steps
    'thinking.step.understanding': "Анализирую ваш вопрос",
    'thinking.step.selecting': "Выбираю источники",
    'thinking.step.drafting': "Составляю ответ",
    'thinking.step.checking': "Проверяю ответ",
    'thinking.processing': "Думаю...",
    'thinking.explanation': "Иногда Bahor AI требуется немного больше времени для глубокого анализа или проверки актуальных источников, чтобы дать вам более точный ответ.",
    
    // Coding steps
    'thinking.step.coding.analyzing': "Анализирую структуру кода",
    'thinking.step.coding.patterns': "Выбираю лучшие паттерны",
    'thinking.step.coding.solution': "Разрабатываю решение",
    'thinking.step.coding.optimizing': "Оптимизирую код",
    
    // Translation steps
    'thinking.step.translation.understanding': "Читаю исходный текст",
    'thinking.step.translation.context': "Анализирую контекст",
    'thinking.step.translation.adapting': "Адаптирую к языку",
    'thinking.step.translation.polishing': "Шлифую перевод",
    
    // Essay steps
    'thinking.step.essay.analyzing': "Анализирую тему",
    'thinking.step.essay.structuring': "Планирую структуру",
    'thinking.step.essay.writing': "Пишу текст",
    'thinking.step.essay.reviewing': "Проверяю текст",
    
    // Math steps
    'thinking.step.math.parsing': "Разбираю задачу",
    'thinking.step.math.method': "Выбираю метод",
    'thinking.step.math.calculating': "Вычисляю",
    'thinking.step.math.verifying': "Проверяю ответ",
    
    // Search steps
    'thinking.step.searching.query': "Формирую запрос",
    'thinking.step.searching.sources': "Ищу надёжные источники",
    'thinking.step.searching.analyzing': "Анализирую результаты",
    'thinking.step.searching.compiling': "Собираю ответ",
    
    // Vision steps
    'thinking.step.vision.scanning': "Сканирую изображение",
    'thinking.step.vision.recognizing': "Распознаю объекты",
    'thinking.step.vision.understanding': "Понимаю содержание",
    'thinking.step.vision.formulating': "Формулирую ответ",
    
    // Reasoning explanations
    'thinking.reason.step1': "Этот шаг нужен для полного понимания вашего вопроса.",
    'thinking.reason.step2': "Выбираем самую надёжную и актуальную информацию.",
    'thinking.reason.step3': "Готовим понятный и точный ответ для вас.",
    'thinking.reason.step4': "Проверяем ответ на точность и полноту.",
    
    // Voice Mode
    'voice.startVoice': "Голосовой режим",
    'voice.listening': "Слушаю...",
    'voice.understanding': "Понимаю ваш голос...",
    'voice.preparing': "Готовлю ответ...",
    'voice.tapToSpeak': "Нажмите, чтобы говорить",
    'voice.speakNaturally': "Говорите естественно. Bahor AI слушает.",
    'voice.processingVoice': "Обрабатываю ваш голос",
    'voice.almostReady': "Почти готово",
    'voice.readyToListen': "Готов слушать",
    'voice.tapToStop': "Нажмите, чтобы остановить",
    'voice.tapToStart': "Нажмите, чтобы начать",
    'voice.cancel': "Отмена",
    'voice.replay': "Повторить",
    'voice.toggleCaptions': "Субтитры",
    'voice.toggleMute': "Без звука",
    'voice.step.transcribing': "Преобразую речь в текст",
    'voice.step.analyzing': "Анализирую намерение",
    'voice.step.preparing': "Готовлю ответ",
    'voice.demo.greeting': "Привет, чем вы можете мне помочь сегодня?",
    'voice.demo.question': "Помогите написать эссе на английском",
    'voice.demo.answer': "Конечно! Какая тема? Я помогу со структурой, введением, основной частью и заключением.",
    'voice.switchToText': "Текстовый режим",
    // Voice Mode States
    'voice.state.listening': "Слушаю...",
    'voice.state.listening.sub': "Говорите естественно. Bahor AI слушает.",
    'voice.state.thinking': "Думаю...",
    'voice.state.thinking.sub': "Анализирую ваш вопрос.",
    'voice.state.speaking': "Отвечаю...",
    'voice.state.speaking.sub': "Пожалуйста, подождите.",
    
    // Settings Page
    'settings.title': 'Настройки',
    'settings.back': 'Назад',
    'settings.edit': 'Редактировать',
    'settings.logout': 'Выйти',
    'settings.notifications': 'Уведомления',
    'settings.news': 'Новости',
    'settings.newsDesc': 'Новые функции',
    'settings.tips': 'Советы',
    'settings.tipsDesc': 'Полезные идеи',
    'settings.discounts': 'Скидки',
    'settings.discountsDesc': 'Специальные предложения',
    'settings.experience': 'Опыт Bahor AI',
    'settings.animations': 'Анимации',
    'settings.animationsDesc': 'Эффекты интерфейса',
    'settings.smartSuggestions': 'Умные подсказки',
    'settings.smartSuggestionsDesc': 'Рекомендуемые вопросы',
    'settings.security': 'Безопасность',
    'settings.changePassword': 'Изменить пароль',
    'settings.logoutAllDevices': 'Выйти со всех устройств',
    'settings.appSettings': 'Настройки приложения',
    'settings.language': 'Язык',
    'settings.theme': 'Тема',
    'settings.themeLight': 'Светлая',
    'settings.themeDark': 'Тёмная',
    'settings.subscription': 'Статус подписки',
    'settings.helpLegal': 'Помощь и правовая информация',
    'settings.helpCenter': 'Центр помощи',
    'settings.reportBug': 'Сообщить об ошибке',
    'settings.terms': 'Условия использования',
    'settings.privacy': 'Политика конфиденциальности',
    'settings.viewAllPlans': 'Посмотреть все планы и цены →',
    'settings.usageToday': 'Использование сегодня',
    'settings.plan': 'план',
    'settings.unlimited': 'Безлимитно',
    'settings.comingSoon': 'Эта функция скоро появится',
    'settings.logoutSuccess': 'Вы вышли со всех устройств',
    'settings.error': 'Произошла ошибка',
    'settings.logoutError': 'Ошибка при выходе',
    'settings.user': 'Пользователь',
    'settings.free': 'Бесплатно',
    'settings.premium': 'Премиум',
    'settings.ultra': 'Ультра',
    'settings.devUnlimited': 'Dev Unlimited',
    
    // Modes Page
    'modes.title': 'Bahor AI',
    'modes.question': 'Чем вам помочь сегодня?',
    'modes.subtitle': 'Bahor AI помогает в различных областях',
    'modes.primary': 'Основные возможности',
    'modes.learning': 'Обучение и развитие',
    
    // Feedback Page
    'feedback.title': 'Отправить отзыв',
    'feedback.type': 'Тип',
    'feedback.bug': 'Ошибка',
    'feedback.idea': 'Предложение',
    'feedback.other': 'Другое',
    'feedback.message': 'Сообщение',
    'feedback.messagePlaceholder.bug': 'Какая ошибка произошла? Объясните по шагам...',
    'feedback.messagePlaceholder.idea': 'Опишите ваше предложение подробно...',
    'feedback.messagePlaceholder.other': 'Напишите ваше сообщение...',
    'feedback.screenshot': 'Скриншот (необязательно)',
    'feedback.addImage': 'Добавить изображение',
    'feedback.submit': 'Отправить',
    'feedback.thanks': 'Ваш отзыв помогает улучшить Bahor AI. Спасибо!',
    'feedback.success': 'Отправлено, спасибо! 🙏',
    'feedback.error': 'Произошла ошибка. Попробуйте ещё раз.',
    'feedback.emptyMessage': 'Пожалуйста, напишите сообщение',
    'feedback.imageTooLarge': 'Изображение должно быть меньше 5МБ',
    
    // Beta Banner
    'beta.title': 'Бета-версия',
    'beta.description': 'Возможны ошибки. Ваш отзыв очень важен —',
    'beta.report': 'сообщите здесь',
    
    // Terms Page
    'terms.title': 'Условия использования',
    'terms.lastUpdated': 'Последнее обновление: январь 2025',
    
    // Privacy Page
    'privacy.title': 'Политика конфиденциальности',
    'privacy.lastUpdated': 'Последнее обновление: январь 2025',
    
    // Support Page
    'support.title': 'Помощь',
    'support.contact': 'Контакты',
    'support.contactDesc': 'Для ваших вопросов',
    'support.email': 'Эл. почта',
    'support.reportBug': 'Сообщить об ошибке',
    'support.reportBugDesc': 'Помогите нам исправить проблемы',
    'support.sendBug': 'Отправить отчёт об ошибке',
    'support.howToReport': 'Как сообщить об ошибке?',
    'support.step1': 'Перейдите в Настройки → "Сообщить об ошибке"',
    'support.step2': 'Выберите тип (ошибка, предложение или другое)',
    'support.step3': 'Подробно опишите проблему. Если возможно, добавьте скриншот.',
    'support.step4': 'Нажмите Отправить. Мы скоро рассмотрим!',
    'support.faqComingSoon': 'FAQ и руководства скоро появятся',
    
    // Common
    'common.back': 'Назад',
  },

  tr: {
    // App
    'app.name': 'Bahor AI',
    'app.tagline.main': 'İlk Özbek yapay zekâsı — Özbekler için.',
    'app.tagline.sub': 'Özbek dili ve kültürü için özel olarak tasarlanmış, çok hızlı bir yapay zekâ asistanı.',
    
    // Header & Navigation
    'nav.home': 'Ana sayfa',
    'nav.features': 'Özellikler',
    'nav.pricing': 'Fiyatlandırma',
    'nav.blog': 'Blog',
    'button.openApp': "Bahor AI'ı Aç",
    'button.learnMore': 'Daha fazla bilgi',
    'button.start': 'Başla',
    'button.startUsing': "Bahor AI'ı Kullanmaya Başla",
    'button.comingSoon': 'Yakında',
    
    // Hero Section
    'badge.beta': 'Şu anda Beta',
    'label.freeDuringBeta': 'Beta sürecinde şu an ücretsiz kullanılabilir.',
    
    // Features Section
    'section.whyChoose': 'Neden Bahor AI?',
    'section.whyChoose.subtitle': 'Özbekçe konuşanların ihtiyaçları için özel olarak tasarlandı',
    'feature.uzbekOptimized.title': 'Özbekçe için optimize edildi',
    'feature.uzbekOptimized.desc': 'Özbek argosunu, doğal ifadeleri ve gerçek hayat bağlamını anlar.',
    'feature.affordable.title': 'Uygun fiyatlar',
    'feature.affordable.desc': "Yabancı AI hizmetlerinden %80 daha ucuz. Özbekistan için optimize edilmiş fiyatlar.",
    'feature.specializedModes.title': 'Özel modlar',
    'feature.specializedModes.desc': 'Kodlama, IELTS, iş, pazarlama, ödev yardımı ve daha fazlası.',
    'feature.fastSimple.title': 'Hızlı, basit, sezgisel',
    'feature.fastSimple.desc': 'Karmaşık menüler yok. Sadece sorun ve anında yardım alın.',
    'feature.futurePlans.title': 'Gelecekteki premium planlar',
    'feature.futurePlans.desc': 'Beta sürecinde şu an ücretsiz. Ek özelliklerle ücretli planlar yakında.',
    
    // Built For Section
    'builtFor.badge': 'Özbekistan için',
    'builtFor.title': 'Özbekistan için özel olarak tasarlandı',
    'builtFor.description': 'Bahor AI, Özbekçe dili, kültürü ve yerel ihtiyaçları anlar. Özbekçe konuşanlar için en iyi AI deneyimini oluşturuyoruz.',
    
    // Mockup
    'mockup.userMessage': "İngilizce bir kompozisyon yazmama yardım et",
    'mockup.aiMessage': 'Tabii! Hangi konuda olsun?',
    
    // Modes Section
    'section.exploreModes': 'Bahor AI Modlarını Keşfedin',
    'section.exploreModes.subtitle': 'Her ihtiyaç için özel AI asistanlar',
    'mode.general.title': 'Genel Sohbet',
    'mode.general.desc': 'Her türlü soru ve sohbet için evrensel asistan.',
    'mode.tech.title': 'Teknoloji ve Kod',
    'mode.tech.desc': 'Programlama, hata ayıklama ve teknik sorularda yardım alın.',
    'mode.life.title': 'Yaşam Yardımı',
    'mode.life.desc': 'Günlük yaşam, tarifler ve günlük görevler için pratik tavsiyeler.',
    'mode.business.title': 'İş ve Pazarlama',
    'mode.business.desc': 'İş büyümesi ve pazarlama kampanyaları için stratejik rehberlik.',
    'mode.english.title': 'İngilizce ve IELTS',
    'mode.english.desc': 'İngilizce becerilerinizi geliştirin ve IELTS sınavlarına hazırlanın.',
    'mode.homework.title': 'Ödev ve Dersler',
    'mode.homework.desc': 'Okul ödevleri ve akademik konularda yardım alın.',
    'mode.job.title': 'İş ve Özgeçmiş',
    'mode.job.desc': 'Profesyonel özgeçmişler oluşturun ve iş görüşmelerine hazırlanın.',
    'mode.finance.title': 'Finansal Okuryazarlık',
    'mode.finance.desc': 'Bütçeleme, tasarruf ve finansal planlama hakkında öğrenin.',
    'mode.health.title': 'Sağlık ve Fitness',
    'mode.health.desc': 'Sağlık, beslenme ve sağlıklı yaşam hakkında tavsiyeler alın.',
    
    // How It Works Section
    'section.howItWorks': 'Bahor AI Nasıl Çalışır',
    'section.howItWorks.subtitle': 'Üç basit adımda başlayın',
    'step.1.title': 'Her şeyi sorun',
    'step.1.desc': 'Okul ödevlerinden tariflere, kodlama yardımına kadar.',
    'step.2.title': 'Bir mod seçin (isteğe bağlı)',
    'step.2.desc': 'Özel bir mod seçerek daha kesin yanıtlar alın.',
    'step.3.title': 'Sohbete devam edin',
    'step.3.desc': 'Anında iyileştirin, ayarlayın veya takip soruları sorun.',
    
    // Pricing Section
    'section.pricing': 'Fiyatlandırma',
    'section.pricing.subtitle': 'Size en uygun planı seçin',
    'pricing.free.name': 'Ücretsiz (beta)',
    'pricing.free.desc': 'Başlamak için',
    'pricing.free.feature1': 'Günde 5 mesaj',
    'pricing.free.feature2': 'Temel sohbet modu',
    'pricing.free.feature3': 'Sınırlı özellikler',
    'pricing.monthly.name': 'Aylık Plan',
    'pricing.monthly.desc': 'Profesyonel kullanıcılar için',
    'pricing.monthly.feature1': 'Sınırsız mesaj',
    'pricing.monthly.feature2': 'Tüm özel modlar',
    'pricing.monthly.feature3': 'Dosya ve görsel analizi',
    'pricing.monthly.feature4': 'Daha hızlı yanıtlar',
    'pricing.monthly.badge': 'En Popüler',
    'pricing.yearly.name': 'Yıllık Plan',
    'pricing.yearly.desc': 'Maksimum tasarruf',
    'pricing.yearly.feature1': 'Tüm aylık plan özellikleri',
    'pricing.yearly.feature2': '%42 tasarruf',
    'pricing.yearly.feature3': 'Yeni özelliklere erken erişim',
    'pricing.yearly.badge': 'En İyi Değer',
    'pricing.currency': 'UZS',
    'pricing.comparison': "ChatGPT'den 5 kat daha ucuz, daha hızlı yanıtlar ile.",
    
    // FAQ Section
    'section.faq': 'Sık Sorulan Sorular',
    'section.faq.subtitle': 'Bahor AI hakkında genel sorular',
    'faq.1.question': "Bahor AI, ChatGPT ile aynı mı?",
    'faq.1.answer': "Hayır. Bahor AI, Özbek kullanıcılar, yerel kültür ve yerel kullanım durumları için özelleştirilmiştir.",
    'faq.2.question': "Bahor AI şu anda neden ücretsiz?",
    'faq.2.answer': 'Beta sürecindeyiz, geri bildirim topluyoruz ve hizmeti iyileştiriyoruz.',
    'faq.3.question': 'Bahor AI hangi dilleri destekliyor?',
    'faq.3.answer': 'Ana dil Özbekçedir. İngilizce ve Rusça da anlaşılır.',
    'faq.4.question': 'Verilerim güvende mi?',
    'faq.4.answer': 'Evet. Kişisel veriler üçüncü taraflarla paylaşılmaz. Gizlilik politikamıza bakın.',
    
    // Footer
    'footer.rights': '© 2024 Bahor AI. Tüm hakları saklıdır.',
    
    // Language
    'lang.uz': 'Özbekçe',
    'lang.en': 'İngilizce',
    'lang.ru': 'Rusça',
    'lang.tr': 'Türkçe',
    'lang.choose': 'Dil seçin',
    
    // Chat Page
    'chat.title.general': 'Genel sohbet',
    'chat.subtitle.general': 'Her şeyi sorabilir veya sohbet edebilirsiniz',
    'chat.dailyLimit': 'Bugünkü sınır: {used} / {max} mesaj',
    'chat.input.placeholder': 'Sorunuzu yazın...',
    'chat.attach.tooltip': 'Dosya veya görsel yükle',
    'chat.clear': 'Sohbeti temizle',
    'chat.newChat': 'Yeni sohbet',
    'chat.history': 'Sohbet geçmişi',
    'chat.typing': 'Bahor AI yazıyor...',
    'chat.send': 'Gönder',
    
    // Daily Usage
    'usage.today': 'Bugünkü sınır',
    'usage.requests': 'mesaj',
    'usage.limitReached': 'Bugünkü ücretsiz sınır doldu',
    'usage.limitReached.desc': "Bahor AI'ı sınırsız kullanmak için Premium'a yükseltin. Sınırsız sohbetler, dosya ve görsel analizi, özel modlar ve daha hızlı yanıtlar.",
    'usage.upgradeToPremium': "Premium'a Yükselt",
    'usage.continueTomorrow': 'Yarın devam edeceğim',
    
    // Delete Modal
    'delete.title': 'Bu sohbet silinsin mi?',
    'delete.description': 'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    'delete.cancel': 'İptal',
    'delete.confirm': 'Sil',
    
    // Thinking Bar
    'thinking.reasoning': "Derin düşünüyor...",
    'thinking.searching': "Web'de aranıyor...",
    'thinking.vision': "Analiz ediliyor...",
    'thinking.finalising': "Cevap hazırlanıyor...",
    'thinking.slow': "Daha derin analiz yapılıyor...",
    'thinking.almostDone': "Neredeyse hazır",
    'thinking.seconds': "saniye",
    'thinking.fewMoreSeconds': "Birkaç saniye daha...",
    'thinking.showReasoning': "Tam düşünce sürecini göster",
    'thinking.hideReasoning': "Düşünce sürecini gizle",
    'thinking.deepReasoning': "🧠 Derin düşünme aktif",
    'thinking.clickToExpand': "(genişletmek için tıkla)",
    'thinking.sourcesUsed': "Kullanılan kaynaklar",
    'thinking.reasoningProcess': "Düşünme süreci",
    
    // General steps
    'thinking.step.understanding': "Sorunuz analiz ediliyor",
    'thinking.step.selecting': "Kaynaklar seçiliyor",
    'thinking.step.drafting': "Cevap hazırlanıyor",
    'thinking.step.checking': "Cevap kontrol ediliyor",
    'thinking.processing': "Düşünülüyor...",
    'thinking.explanation': "Bazen Bahor AI, size daha doğru bir cevap vermek için derin düşünmek veya güncel web kaynaklarını kontrol etmek için birkaç saniye daha alabilir.",
    
    // Coding steps
    'thinking.step.coding.analyzing': "Kod yapısı analiz ediliyor",
    'thinking.step.coding.patterns': "En iyi kalıplar seçiliyor",
    'thinking.step.coding.solution': "Çözüm geliştiriliyor",
    'thinking.step.coding.optimizing': "Kod optimize ediliyor",
    
    // Translation steps
    'thinking.step.translation.understanding': "Kaynak metin okunuyor",
    'thinking.step.translation.context': "Bağlam analiz ediliyor",
    'thinking.step.translation.adapting': "Hedef dile uyarlanıyor",
    'thinking.step.translation.polishing': "Çeviri cilâlanıyor",
    
    // Essay steps
    'thinking.step.essay.analyzing': "Konu analiz ediliyor",
    'thinking.step.essay.structuring': "Yapı planlanıyor",
    'thinking.step.essay.writing': "İçerik yazılıyor",
    'thinking.step.essay.reviewing': "Metin gözden geçiriliyor",
    
    // Math steps
    'thinking.step.math.parsing': "Problem çözümleniyor",
    'thinking.step.math.method': "Yaklaşım seçiliyor",
    'thinking.step.math.calculating': "Hesaplanıyor",
    'thinking.step.math.verifying': "Cevap doğrulanıyor",
    
    // Search steps
    'thinking.step.searching.query': "Arama sorgusu oluşturuluyor",
    'thinking.step.searching.sources': "Güvenilir kaynaklar aranıyor",
    'thinking.step.searching.analyzing': "Sonuçlar analiz ediliyor",
    'thinking.step.searching.compiling': "Cevap derleniyor",
    
    // Vision steps
    'thinking.step.vision.scanning': "Görsel taranıyor",
    'thinking.step.vision.recognizing': "Nesneler tanınıyor",
    'thinking.step.vision.understanding': "İçerik anlaşılıyor",
    'thinking.step.vision.formulating': "Yanıt formüle ediliyor",
    
    // Reasoning explanations
    'thinking.reason.step1': "Bu adım sorunuzu tam anlamak için gereklidir.",
    'thinking.reason.step2': "En güvenilir ve ilgili bilgileri seçiyoruz.",
    'thinking.reason.step3': "Size net ve doğru bir cevap hazırlıyoruz.",
    'thinking.reason.step4': "Cevabı doğruluk ve bütünlük açısından kontrol ediyoruz.",
    
    // Voice Mode
    'voice.startVoice': "Sesli mod",
    'voice.listening': "Dinliyorum...",
    'voice.understanding': "Sesinizi anlıyorum...",
    'voice.preparing': "Cevabınız hazırlanıyor...",
    'voice.tapToSpeak': "Konuşmak için dokunun",
    'voice.speakNaturally': "Doğal konuşun. Bahor AI dinliyor.",
    'voice.processingVoice': "Sesiniz işleniyor",
    'voice.almostReady': "Neredeyse hazır",
    'voice.readyToListen': "Dinlemeye hazır",
    'voice.tapToStop': "Durdurmak için dokunun",
    'voice.tapToStart': "Başlatmak için dokunun",
    'voice.cancel': "İptal",
    'voice.replay': "Tekrar oynat",
    'voice.toggleCaptions': "Altyazılar",
    'voice.toggleMute': "Sessiz",
    'voice.step.transcribing': "Konuşma metne dönüştürülüyor",
    'voice.step.analyzing': "Niyet analiz ediliyor",
    'voice.step.preparing': "Cevap hazırlanıyor",
    'voice.demo.greeting': "Merhaba, bugün size nasıl yardımcı olabilirim?",
    'voice.demo.question': "İngilizce bir deneme yazmama yardım et",
    'voice.demo.answer': "Elbette! Konu ne olsun? Yapı, giriş, ana paragraflar ve sonuç konusunda yardımcı olabilirim.",
    'voice.switchToText': "Metin modu",
    // Voice Mode States
    'voice.state.listening': "Dinliyorum...",
    'voice.state.listening.sub': "Doğal konuşun. Bahor AI dinliyor.",
    'voice.state.thinking': "Düşünüyorum...",
    'voice.state.thinking.sub': "Sorunuzu analiz ediyorum.",
    'voice.state.speaking': "Cevaplıyorum...",
    'voice.state.speaking.sub': "Lütfen bekleyin.",
    
    // Settings Page
    'settings.title': 'Ayarlar',
    'settings.back': 'Geri',
    'settings.edit': 'Düzenle',
    'settings.logout': 'Çıkış',
    'settings.notifications': 'Bildirimler',
    'settings.news': 'Haberler',
    'settings.newsDesc': 'Yeni özellikler',
    'settings.tips': 'İpuçları',
    'settings.tipsDesc': 'Faydalı fikirler',
    'settings.discounts': 'İndirimler',
    'settings.discountsDesc': 'Özel teklifler',
    'settings.experience': 'Bahor AI Deneyimi',
    'settings.animations': 'Animasyonlar',
    'settings.animationsDesc': 'Arayüz efektleri',
    'settings.smartSuggestions': 'Akıllı öneriler',
    'settings.smartSuggestionsDesc': 'Önerilen sorular',
    'settings.security': 'Güvenlik',
    'settings.changePassword': 'Şifre değiştir',
    'settings.logoutAllDevices': 'Tüm cihazlardan çıkış',
    'settings.appSettings': 'Uygulama ayarları',
    'settings.language': 'Dil',
    'settings.theme': 'Tema',
    'settings.themeLight': 'Açık',
    'settings.themeDark': 'Koyu',
    'settings.subscription': 'Abonelik durumu',
    'settings.helpLegal': 'Yardım ve Yasal',
    'settings.helpCenter': 'Yardım merkezi',
    'settings.reportBug': 'Hata bildir',
    'settings.terms': 'Kullanım şartları',
    'settings.privacy': 'Gizlilik politikası',
    'settings.viewAllPlans': 'Tüm planları ve fiyatları görüntüle →',
    'settings.usageToday': 'Bugünkü kullanım',
    'settings.plan': 'plan',
    'settings.unlimited': 'Sınırsız',
    'settings.comingSoon': 'Bu özellik yakında gelecek',
    'settings.logoutSuccess': 'Tüm cihazlardan çıkış yapıldı',
    'settings.error': 'Bir hata oluştu',
    'settings.logoutError': 'Çıkış sırasında hata',
    'settings.user': 'Kullanıcı',
    'settings.free': 'Ücretsiz',
    'settings.premium': 'Premium',
    'settings.ultra': 'Ultra',
    'settings.devUnlimited': 'Dev Unlimited',
    
    // Modes Page
    'modes.title': 'Bahor AI',
    'modes.question': 'Bugün size nasıl yardımcı olabilirim?',
    'modes.subtitle': 'Bahor AI çeşitli alanlarda size yardımcı olur',
    'modes.primary': 'Ana özellikler',
    'modes.learning': 'Öğrenme ve Gelişim',
    
    // Feedback Page
    'feedback.title': 'Geri Bildirim Gönder',
    'feedback.type': 'Tür',
    'feedback.bug': 'Hata',
    'feedback.idea': 'Öneri',
    'feedback.other': 'Diğer',
    'feedback.message': 'Mesaj',
    'feedback.messagePlaceholder.bug': 'Ne gibi bir hata oluştu? Adım adım açıklayın...',
    'feedback.messagePlaceholder.idea': 'Önerinizi detaylı açıklayın...',
    'feedback.messagePlaceholder.other': 'Mesajınızı yazın...',
    'feedback.screenshot': 'Ekran görüntüsü (isteğe bağlı)',
    'feedback.addImage': 'Resim ekle',
    'feedback.submit': 'Gönder',
    'feedback.thanks': 'Geri bildiriminiz Bahor AI\'ı geliştirmemize yardımcı olur. Teşekkürler!',
    'feedback.success': 'Gönderildi, teşekkürler! 🙏',
    'feedback.error': 'Bir hata oluştu. Lütfen tekrar deneyin.',
    'feedback.emptyMessage': 'Lütfen mesajınızı yazın',
    'feedback.imageTooLarge': "Resim 5MB'dan küçük olmalıdır",
    
    // Beta Banner
    'beta.title': 'Beta sürümü',
    'beta.description': 'Hatalar olabilir. Geri bildiriminiz çok önemli —',
    'beta.report': 'buradan bildirin',
    
    // Terms Page
    'terms.title': 'Kullanım Şartları',
    'terms.lastUpdated': 'Son güncelleme: Ocak 2025',
    
    // Privacy Page
    'privacy.title': 'Gizlilik Politikası',
    'privacy.lastUpdated': 'Son güncelleme: Ocak 2025',
    
    // Support Page
    'support.title': 'Yardım',
    'support.contact': 'İletişim',
    'support.contactDesc': 'Sorularınız için',
    'support.email': 'E-posta',
    'support.reportBug': 'Hata bildir',
    'support.reportBugDesc': 'Sorunları düzeltmemize yardım edin',
    'support.sendBug': 'Hata raporu gönder',
    'support.howToReport': 'Hata nasıl bildirilir?',
    'support.step1': 'Ayarlar → "Hata bildir" e gidin',
    'support.step2': 'Türü seçin (hata, öneri veya diğer)',
    'support.step3': 'Sorunu ayrıntılı açıklayın. Mümkünse ekran görüntüsü ekleyin.',
    'support.step4': 'Gönder\'e basın. En kısa sürede inceleyeceğiz!',
    'support.faqComingSoon': 'SSS ve kılavuzlar yakında',
    
    // Common
    'common.back': 'Geri',
  },
};

// Helper function to get translation with parameter replacement
export function translate(language: Lang, key: string, params?: Record<string, string | number>): string {
  const value = translations[language]?.[key];
  
  // Return [[MISSING:key]] if not found to make untranslated strings obvious
  if (!value) {
    if (import.meta.env.DEV) {
      console.warn(`Missing translation: ${key} for language: ${language}`);
    }
    return `[[MISSING:${key}]]`;
  }
  
  if (!params) return value;
  
  return Object.entries(params).reduce(
    (str, [param, val]) => str.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val)),
    value
  );
}

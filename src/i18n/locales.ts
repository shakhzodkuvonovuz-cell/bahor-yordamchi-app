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
    'feature.specializedModes.title': 'Maxsus rejimlar',
    'feature.specializedModes.desc': 'Kod yozish, IELTS, biznes, marketing, uy vazifasi va boshqalar.',
    'feature.fastSimple.title': 'Tez, oddiy, qulay',
    'feature.fastSimple.desc': "Murakkab menyular yo'q. Shunchaki so'rang va tezkor yordam oling.",
    'feature.futurePlans.title': 'Kelajakda premium rejalar',
    'feature.futurePlans.desc': "Hozircha beta davrida bepul. Pullik rejalar tez orada qo'shimcha imkoniyatlar bilan ishga tushadi.",
    
    // Modes Section
    'section.exploreModes': 'Bahor AI rejimlarini kashf qiling',
    'section.exploreModes.subtitle': 'Har bir ehtiyoj uchun maxsus AI yordamchilar',
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
    'feature.specializedModes.title': 'Specialized modes',
    'feature.specializedModes.desc': 'Coding, IELTS, business, marketing, homework help, and more.',
    'feature.fastSimple.title': 'Fast, simple, intuitive',
    'feature.fastSimple.desc': 'No complicated menus. Just ask and get instant help.',
    'feature.futurePlans.title': 'Future premium plans',
    'feature.futurePlans.desc': 'Currently free in beta. Paid plans will launch soon with additional features.',
    
    // Modes Section
    'section.exploreModes': 'Explore Bahor AI Modes',
    'section.exploreModes.subtitle': 'Specialized AI assistants for every need',
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
    'feature.specializedModes.title': 'Специализированные режимы',
    'feature.specializedModes.desc': 'Программирование, IELTS, бизнес, маркетинг, помощь с домашними заданиями и многое другое.',
    'feature.fastSimple.title': 'Быстро, просто, интуитивно',
    'feature.fastSimple.desc': 'Без сложных меню. Просто спросите и получите мгновенную помощь.',
    'feature.futurePlans.title': 'Будущие премиум-планы',
    'feature.futurePlans.desc': 'Сейчас бесплатно в бете. Платные планы скоро появятся с дополнительными функциями.',
    
    // Modes Section
    'section.exploreModes': 'Изучите режимы Bahor AI',
    'section.exploreModes.subtitle': 'Специализированные ИИ-ассистенты для каждой потребности',
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
    'feature.specializedModes.title': 'Özel modlar',
    'feature.specializedModes.desc': 'Kodlama, IELTS, iş, pazarlama, ödev yardımı ve daha fazlası.',
    'feature.fastSimple.title': 'Hızlı, basit, sezgisel',
    'feature.fastSimple.desc': 'Karmaşık menüler yok. Sadece sorun ve anında yardım alın.',
    'feature.futurePlans.title': 'Gelecekteki premium planlar',
    'feature.futurePlans.desc': 'Beta sürecinde şu an ücretsiz. Ek özelliklerle ücretli planlar yakında.',
    
    // Modes Section
    'section.exploreModes': 'Bahor AI Modlarını Keşfedin',
    'section.exploreModes.subtitle': 'Her ihtiyaç için özel AI asistanlar',
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
  },
};

// Helper function to get translation with parameter replacement
export function translate(language: Lang, key: string, params?: Record<string, string | number>): string {
  const value = translations[language]?.[key] || translations['uz']?.[key] || key;
  
  if (!params) return value;
  
  return Object.entries(params).reduce(
    (str, [param, val]) => str.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val)),
    value
  );
}

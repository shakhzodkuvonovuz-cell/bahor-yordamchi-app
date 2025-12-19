import { Language } from "@/hooks/useLanguage";

export const translations = {
  uz: {
    // Homepage
    heroText: "Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun.",
    subtitle: "Yoki quyidagi maxsus imkoniyatlardan birini tanlang.",
    chatPlaceholder: "Savolingizni yozing...",
    
    // Modes
    modes: {
      general: {
        title: "Umumiy suhbat",
        subtitle: "Har qanday savol va suhbat uchun",
      },
      tech: {
        title: "Texnologiya va Kod",
        subtitle: "Kod yozish, dasturlash va texnologiya yordami",
      },
      daily: {
        title: "Kundalik Hayot Yordami",
        subtitle: "Retseptlar, maslahatlar va kundalik hayot",
      },
      business: {
        title: "Biznes va Marketing",
        subtitle: "Biznes g'oyalari va marketing kontenti",
      },
      ielts: {
        title: "Ingliz tili va IELTS",
        subtitle: "Ingliz tili va IELTSga tayyorgarlik",
      },
      homework: {
        title: "Uy vazifasi va fanlar",
        subtitle: "Maktab va universitet fanlari bo'yicha yordam",
      },
      job: {
        title: "Ish va Rezyume",
        subtitle: "Rezyume, suhbat va ish topishda yordam",
      },
    financial: {
      title: "Moliyaviy savodxonlik",
      subtitle: "Moliya bo'yicha umumiy ma'lumot va tushuntirishlar",
    },
    health: {
      title: "Sog'liq va fitness",
      subtitle: "Sog'lom ovqatlanish va mashg'ulotlar bo'yicha yordam",
    },
  },
    
    // Settings
    settings: {
      title: "Sozlamalar",
      back: "Orqaga",
      userInfo: "Foydalanuvchi ma'lumotlari",
      name: "Ism",
      namePlaceholder: "Ismingizni kiriting",
      theme: "Mavzu",
      lightMode: "Yorug' rejim",
      darkMode: "Qorong'u rejim",
      language: "Til",
      languageUz: "O'zbek",
      languageEn: "English",
      languageRu: "Русский",
      languageTr: "Türkçe",
      status: "Status",
      statusText: "Tekin sinov versiyasi",
      version: "Versiya: v0.1 (MVP)",
      note: "Bahor AI hozircha MVP versiyasida. Haqiqiy AI integratsiyasi tez orada qo'shiladi.",
      // New section titles
      account: "Hisob",
      app: "Ilova",
      helpLegal: "Yordam va huquqiy",
      // Account section
      profile: "Profil",
      security: "Xavfsizlik",
      logout: "Hisobdan chiqish",
      // App section
      subscription: "Obuna holati",
      // Help & Legal section
      helpCenter: "Yordam markazi",
      reportBug: "Xatolik haqida xabar berish",
      terms: "Foydalanish shartlari",
      privacy: "Maxfiylik siyosati",
    },
    
    // Chat
    chat: {
      back: "Orqaga",
      clearChat: "Suhbatni tozalash",
      typing: "Bahor AI yozmoqda...",
      send: "Yuborish",
      defaultChatTitle: "Yangi suhbat",
      chatHistory: "Suhbat tarixi",
    },
    
    // Quick Suggestions
    suggestions: {
      general: [
        "Menga bir foydali maslahat ber",
        "Bugun nimani o'rganishim mumkin?",
      ],
      tech: [
        "Bu kodni tushuntirib ber",
        "Dasturlashni qayerdan boshlashim kerak?",
      ],
      daily: [
        "Bugun kechki ovqat uchun nima pishirsam bo'ladi?",
        "Vaqtni samarali boshqarish bo'yicha maslahat ber",
      ],
      business: [
        "Kichik biznes g'oyasini taklif et",
        "Telegram/Instagram sahifam uchun kontent g'oya ber",
      ],
      ielts: [
        "IELTS speaking savol ber",
        "Ingliz matnini tekshirib ber",
      ],
      homework: [
        "Matematik misolni tushuntir",
        "Formulani sodda tilda tushuntir",
      ],
      job: [
        "Rezyumeni yaxshilashga yordam ber",
        "Ish suhbatiga tayyorlanishimga yordam ber",
      ],
      financial: [
        "Oylik byudjet tuzishda yordam ber",
        "Oddiy qilib foiz stavkasi nima ekanini tushuntirib ber",
      ],
      health: [
        "Menga mashg'ulot rejasi tuzib ber",
        "Sog'lom ovqatlanish bo'yicha maslahat ber",
      ],
    },
    videoStudio: {
      title: "Video studiya",
      today: "bugun",
      premiumOnly: "Faqat Premium",
      freeBlocked: {
        title: "Video yaratish faqat Premium uchun",
        description: "Video yaratish uchun Premium obunaga o'ting.",
        upgrade: "Premium'ga o'tish",
      },
    },
    imageStudio: {
      freeUsage: "{used}/{limit} (suv belgili)",
      watermarkNotice: "Suv belgili",
    },
    imageStudioV2: {
      title: "Rasm yaratish",
      subtitle: "Sun'iy intellekt yordamida rasmlar yarating",
      rules: "Zo'ravonlik, jiniy yoki siyosiy mazmunli rasmlar yaratish taqiqlangan.",
      modelLabel: "Model",
      model: {
        flux: "FLUX (Tez)",
        sdxl: "SDXL (Sifatli)",
      },
      mode: {
        t2i: "Matndan rasm",
        remix: "Remix",
        controlnet: "ControlNet",
      },
      comingSoon: "Tez kunda",
      controlnetComingSoon: "ControlNet tez kunda!",
      controlnetComingSoonDesc: "Bu funksiya hali ishlab chiqilmoqda.",
      style: {
        realistic: "Realistik",
        digitalArt: "Raqamli san'at",
        illustration: "Illyustratsiya",
        anime: "Anime",
        minimal: "Minimal",
      },
      sourceImageLabel: "Manba rasm",
      dropOrClick: "Rasmni bu yerga tashlang yoki bosing",
      maxFileSize: "Maksimal: {size}",
      error: "Xatolik",
      invalidFileType: "Faqat PNG, JPEG, WebP formatlar qabul qilinadi",
      fileTooLarge: "Fayl hajmi 10MB dan oshmasligi kerak",
      pleaseLogin: "Iltimos, hisobingizga kiring",
      premiumRequired: "Premium talab qilinadi",
      sdxlPremiumOnly: "SDXL modeli faqat Premium foydalanuvchilar uchun",
      remixPremiumOnly: "Remix faqat Premium foydalanuvchilar uchun",
      remixRequiresImage: "Remix uchun rasm yuklang",
      uploadFailed: "Rasm yuklashda xatolik",
      backendPending: "Kutilmoqda",
      backendPendingDesc: "Bu funksiya hali tayyor emas",
      success: "Muvaffaqiyat!",
      imageSaved: "Rasm saqlandi",
      downloadStarted: "Yuklab olish boshlandi",
      promptLabel: "Tavsif (prompt)",
      promptPlaceholder: "Yaratmoqchi bo'lgan rasmingizni tasvirlang...",
      styleLabel: "Uslub",
      aspectLabel: "Nisbat",
      renderLabel: "Render turi",
      render: {
        photo: "Foto",
        illustration: "Illyustratsiya",
      },
      qualityBoost: "Sifat oshirish",
      qualityBoostDesc: "Ko'proq qadamlar (sekinroq)",
      qualityBoostSdxl: "SDXL da avtomatik yuqori sifat",
      remixStrength: "Remix kuchi",
      remixStrengthDesc: "Manba rasmga qanchalik yaqinlik",
      generate: "Yaratish",
      generating: "Yaratilmoqda...",
      result: "Natija",
      download: "Yuklab olish",
      open: "Ochish",
      usedPrompt: "Ishlatilgan prompt",
      resizing: "O'lcham o'zgartirilmoqda...",
      uploading: "Yuklanmoqda...",
      uploaded: "Yuklandi",
      uploadError: "Yuklashda xatolik",
    },
  },
  en: {
    // Homepage
    heroText: "The first Uzbek artificial intelligence — made for Uzbeks.",
    subtitle: "Or choose one of the following specialized features.",
    chatPlaceholder: "Type your question...",
    
    // Modes
    modes: {
      general: {
        title: "General Chat",
        subtitle: "For any question and conversation",
      },
      tech: {
        title: "Technology & Code",
        subtitle: "Coding, programming, and tech assistance",
      },
      daily: {
        title: "Daily Life Help",
        subtitle: "Recipes, tips, and everyday assistance",
      },
      business: {
        title: "Business & Marketing",
        subtitle: "Business ideas and marketing content",
      },
      ielts: {
        title: "English & IELTS",
        subtitle: "English learning and IELTS preparation",
      },
      homework: {
        title: "Homework & Subjects",
        subtitle: "School and university subject assistance",
      },
      job: {
        title: "Job & Resume",
        subtitle: "Resume, interview, and job search help",
      },
    financial: {
      title: "Financial Literacy",
      subtitle: "General financial information and guidance",
    },
    health: {
      title: "Health & Fitness",
      subtitle: "Workout and nutrition guidance",
    },
  },
    
    // Settings
    settings: {
      title: "Settings",
      back: "Back",
      userInfo: "User Information",
      name: "Name",
      namePlaceholder: "Enter your name",
      theme: "Theme",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      language: "Language",
      languageUz: "O'zbek",
      languageEn: "English",
      languageRu: "Русский",
      languageTr: "Türkçe",
      status: "Status",
      statusText: "Free trial version",
      version: "Version: v0.1 (MVP)",
      note: "Bahor AI is currently in MVP version. Real AI integration coming soon.",
      // New section titles
      account: "Account",
      app: "App",
      helpLegal: "Help & Legal",
      // Account section
      profile: "Profile",
      security: "Security",
      logout: "Log out",
      // App section
      subscription: "Subscription status",
      // Help & Legal section
      helpCenter: "Help center",
      reportBug: "Report a bug",
      terms: "Terms of use",
      privacy: "Privacy policy",
    },
    
    // Chat
    chat: {
      back: "Back",
      clearChat: "Clear chat",
      typing: "Bahor AI is typing...",
      send: "Send",
      defaultChatTitle: "New chat",
      chatHistory: "Chat history",
    },
    
    // Quick Suggestions
    suggestions: {
      general: [
        "Give me some useful advice",
        "What can I learn today?",
      ],
      tech: [
        "Explain this code to me",
        "Where should I start learning programming?",
      ],
      daily: [
        "What can I cook for dinner today?",
        "Give me tips for managing my time better",
      ],
      business: [
        "Suggest a small business idea",
        "Give me content ideas for my Telegram/Instagram page",
      ],
      ielts: [
        "Ask me an IELTS Speaking question",
        "Check my English text for mistakes",
      ],
      homework: [
        "Explain a math problem",
        "Explain a formula in simple words",
      ],
      job: [
        "Help me improve my CV/resume",
        "Help me prepare for a job interview",
      ],
      financial: [
        "Help me plan a simple monthly budget",
        "Explain interest rate in simple terms",
      ],
      health: [
        "Create a workout plan for me",
        "Give me advice on healthy eating",
      ],
    },
    videoStudio: {
      title: "Video Studio",
      today: "today",
      premiumOnly: "Premium only",
      freeBlocked: {
        title: "Video generation is Premium only",
        description: "Upgrade to Premium to create videos.",
        upgrade: "Upgrade to Premium",
      },
    },
    imageStudio: {
      freeUsage: "{used}/{limit} (watermarked)",
      watermarkNotice: "Watermarked",
    },
    imageStudioV2: {
      title: "Image Studio",
      subtitle: "Create images with AI",
      rules: "Creating violent, sexual, or political content is prohibited.",
      modelLabel: "Model",
      model: {
        flux: "FLUX (Fast)",
        sdxl: "SDXL (Quality)",
      },
      mode: {
        t2i: "Text to Image",
        remix: "Remix",
        controlnet: "ControlNet",
      },
      comingSoon: "Coming soon",
      controlnetComingSoon: "ControlNet coming soon!",
      controlnetComingSoonDesc: "This feature is still in development.",
      style: {
        realistic: "Realistic",
        digitalArt: "Digital Art",
        illustration: "Illustration",
        anime: "Anime",
        minimal: "Minimal",
      },
      sourceImageLabel: "Source image",
      dropOrClick: "Drop image here or click to upload",
      maxFileSize: "Max: {size}",
      error: "Error",
      invalidFileType: "Only PNG, JPEG, WebP formats accepted",
      fileTooLarge: "File size must not exceed 10MB",
      pleaseLogin: "Please log in to your account",
      premiumRequired: "Premium required",
      sdxlPremiumOnly: "SDXL model is for Premium users only",
      remixPremiumOnly: "Remix is for Premium users only",
      remixRequiresImage: "Upload an image for Remix",
      uploadFailed: "Failed to upload image",
      backendPending: "Pending",
      backendPendingDesc: "This feature is not ready yet",
      success: "Success!",
      imageSaved: "Image saved",
      downloadStarted: "Download started",
      promptLabel: "Description (prompt)",
      promptPlaceholder: "Describe the image you want to create...",
      styleLabel: "Style",
      aspectLabel: "Aspect ratio",
      renderLabel: "Render type",
      render: {
        photo: "Photo",
        illustration: "Illustration",
      },
      qualityBoost: "Quality boost",
      qualityBoostDesc: "More steps (slower)",
      qualityBoostSdxl: "Auto high quality with SDXL",
      remixStrength: "Remix strength",
      remixStrengthDesc: "How close to source image",
      generate: "Generate",
      generating: "Generating...",
      result: "Result",
      download: "Download",
      open: "Open",
      usedPrompt: "Prompt used",
      resizing: "Resizing...",
      uploading: "Uploading...",
      uploaded: "Uploaded",
      uploadError: "Upload error",
    },
  },
  ru: {
    // Homepage
    heroText: "Первый узбекский искусственный интеллект — для узбеков.",
    subtitle: "Или выберите одну из следующих специальных возможностей.",
    chatPlaceholder: "Введите свой вопрос...",
    
    // Modes
    modes: {
      general: {
        title: "Общий чат",
        subtitle: "Для любого вопроса и разговора",
      },
      tech: {
        title: "Технологии и код",
        subtitle: "Программирование и техническая помощь",
      },
      daily: {
        title: "Помощь в повседневной жизни",
        subtitle: "Рецепты, советы и повседневная помощь",
      },
      business: {
        title: "Бизнес и маркетинг",
        subtitle: "Бизнес-идеи и маркетинговый контент",
      },
      ielts: {
        title: "Английский и IELTS",
        subtitle: "Изучение английского и подготовка к IELTS",
      },
      homework: {
        title: "Домашние задания и предметы",
        subtitle: "Помощь по школьным и университетским предметам",
      },
      job: {
        title: "Работа и резюме",
        subtitle: "Резюме, собеседование и поиск работы",
      },
    financial: {
      title: "Финансовая грамотность",
      subtitle: "Общая финансовая информация и советы",
    },
    health: {
      title: "Здоровье и фитнес",
      subtitle: "Тренировки и питание",
    },
  },
    
    // Settings
    settings: {
      title: "Настройки",
      back: "Назад",
      userInfo: "Информация о пользователе",
      name: "Имя",
      namePlaceholder: "Введите ваше имя",
      theme: "Тема",
      lightMode: "Светлый режим",
      darkMode: "Темный режим",
      language: "Язык",
      languageUz: "O'zbek",
      languageEn: "English",
      languageRu: "Русский",
      languageTr: "Türkçe",
      status: "Статус",
      statusText: "Бесплатная пробная версия",
      version: "Версия: v0.1 (MVP)",
      note: "Bahor AI в настоящее время находится в MVP версии. Реальная интеграция ИИ скоро появится.",
      // New section titles
      account: "Аккаунт",
      app: "Приложение",
      helpLegal: "Поддержка и юридическая информация",
      // Account section
      profile: "Профиль",
      security: "Безопасность",
      logout: "Выйти из аккаунта",
      // App section
      subscription: "Статус подписки",
      // Help & Legal section
      helpCenter: "Центр помощи",
      reportBug: "Сообщить об ошибке",
      terms: "Условия использования",
      privacy: "Политика конфиденциальности",
    },
    
    // Chat
    chat: {
      back: "Назад",
      clearChat: "Очистить чат",
      typing: "Bahor AI печатает...",
      send: "Отправить",
      defaultChatTitle: "Новый чат",
      chatHistory: "История чатов",
    },
    
    // Quick Suggestions
    suggestions: {
      general: [
        "Дай мне полезный совет",
        "Что мне сегодня изучить?",
      ],
      tech: [
        "Объясни этот код",
        "С чего начать изучать программирование?",
      ],
      daily: [
        "Что приготовить сегодня на ужин?",
        "Дай советы по управлению временем",
      ],
      business: [
        "Предложи идею для малого бизнеса",
        "Дай идеи для контента в мой Telegram/Instagram",
      ],
      ielts: [
        "Задай мне вопрос для IELTS Speaking",
        "Проверь мой английский текст на ошибки",
      ],
      homework: [
        "Объясни задачу по математике",
        "Объясни формулу простыми словами",
      ],
      job: [
        "Помоги улучшить мое резюме",
        "Помоги подготовиться к собеседованию",
      ],
      financial: [
        "Помоги составить простой месячный бюджет",
        "Объясни, что такое процентная ставка простыми словами",
      ],
      health: [
        "Составь мне план тренировок",
        "Дай совет по здоровому питанию",
      ],
    },
    videoStudio: {
      title: "Видео студия",
      today: "сегодня",
      premiumOnly: "Только Premium",
      freeBlocked: {
        title: "Создание видео доступно только в Premium",
        description: "Перейдите на Premium для создания видео.",
        upgrade: "Перейти на Premium",
      },
    },
    imageStudio: {
      freeUsage: "{used}/{limit} (с водяным знаком)",
      watermarkNotice: "С водяным знаком",
    },
    imageStudioV2: {
      title: "Студия изображений",
      subtitle: "Создавайте изображения с помощью ИИ",
      rules: "Создание насильственного, сексуального или политического контента запрещено.",
      modelLabel: "Модель",
      model: {
        flux: "FLUX (Быстрая)",
        sdxl: "SDXL (Качественная)",
      },
      mode: {
        t2i: "Текст в изображение",
        remix: "Ремикс",
        controlnet: "ControlNet",
      },
      comingSoon: "Скоро",
      controlnetComingSoon: "ControlNet скоро!",
      controlnetComingSoonDesc: "Эта функция ещё в разработке.",
      style: {
        realistic: "Реалистичный",
        digitalArt: "Цифровое искусство",
        illustration: "Иллюстрация",
        anime: "Аниме",
        minimal: "Минимализм",
      },
      sourceImageLabel: "Исходное изображение",
      dropOrClick: "Перетащите изображение сюда или нажмите для загрузки",
      maxFileSize: "Макс: {size}",
      error: "Ошибка",
      invalidFileType: "Принимаются только PNG, JPEG, WebP форматы",
      fileTooLarge: "Размер файла не должен превышать 10МБ",
      pleaseLogin: "Пожалуйста, войдите в аккаунт",
      premiumRequired: "Требуется Premium",
      sdxlPremiumOnly: "Модель SDXL только для Premium пользователей",
      remixPremiumOnly: "Ремикс только для Premium пользователей",
      remixRequiresImage: "Загрузите изображение для ремикса",
      uploadFailed: "Ошибка загрузки изображения",
      backendPending: "Ожидание",
      backendPendingDesc: "Эта функция ещё не готова",
      success: "Успех!",
      imageSaved: "Изображение сохранено",
      downloadStarted: "Загрузка началась",
      promptLabel: "Описание (prompt)",
      promptPlaceholder: "Опишите изображение, которое хотите создать...",
      styleLabel: "Стиль",
      aspectLabel: "Соотношение сторон",
      renderLabel: "Тип рендера",
      render: {
        photo: "Фото",
        illustration: "Иллюстрация",
      },
      qualityBoost: "Улучшение качества",
      qualityBoostDesc: "Больше шагов (медленнее)",
      qualityBoostSdxl: "Автоматически высокое качество с SDXL",
      remixStrength: "Сила ремикса",
      remixStrengthDesc: "Насколько близко к исходному изображению",
      generate: "Создать",
      generating: "Создание...",
      result: "Результат",
      download: "Скачать",
      open: "Открыть",
      usedPrompt: "Использованный prompt",
      resizing: "Изменение размера...",
      uploading: "Загрузка...",
      uploaded: "Загружено",
      uploadError: "Ошибка загрузки",
    },
  },
  tr: {
    // Homepage
    heroText: "Özbekler için oluşturulmuş ilk Özbek yapay zekâsı.",
    subtitle: "Veya aşağıdaki özel özelliklerden birini seçin.",
    chatPlaceholder: "Sorunuzu yazın...",
    
    // Modes
    modes: {
      general: {
        title: "Genel sohbet",
        subtitle: "Her türlü soru ve sohbet için",
      },
      tech: {
        title: "Teknoloji ve kod",
        subtitle: "Kodlama, programlama ve teknoloji yardımı",
      },
      daily: {
        title: "Günlük hayat yardımı",
        subtitle: "Tarifler, ipuçları ve günlük yardım",
      },
      business: {
        title: "İş ve pazarlama",
        subtitle: "İş fikirleri ve pazarlama içeriği",
      },
      ielts: {
        title: "İngilizce ve IELTS",
        subtitle: "İngilizce öğrenimi ve IELTS hazırlığı",
      },
      homework: {
        title: "Ödev ve dersler",
        subtitle: "Okul ve üniversite dersleri yardımı",
      },
      job: {
        title: "İş ve özgeçmiş",
        subtitle: "Özgeçmiş, mülakat ve iş arama yardımı",
      },
      financial: {
        title: "Finansal Okuryazarlık",
        subtitle: "Genel finansal bilgiler ve öneriler",
      },
      health: {
        title: "Sağlık ve fitness",
        subtitle: "Egzersiz ve beslenme desteği",
      },
    },
    
    // Settings
    settings: {
      title: "Ayarlar",
      back: "Geri",
      userInfo: "Kullanıcı bilgileri",
      name: "İsim",
      namePlaceholder: "İsminizi girin",
      theme: "Tema",
      lightMode: "Aydınlık mod",
      darkMode: "Karanlık mod",
      language: "Dil",
      languageUz: "O'zbek",
      languageEn: "English",
      languageRu: "Русский",
      languageTr: "Türkçe",
      status: "Durum",
      statusText: "Ücretsiz deneme sürümü",
      version: "Sürüm: v0.1 (MVP)",
      note: "Bahor AI şu anda MVP sürümündedir. Gerçek yapay zeka entegrasyonu yakında gelecek.",
      // New section titles
      account: "Hesap",
      app: "Uygulama",
      helpLegal: "Destek ve hukuk",
      // Account section
      profile: "Profil",
      security: "Güvenlik",
      logout: "Hesaptan çıkış",
      // App section
      subscription: "Abonelik durumu",
      // Help & Legal section
      helpCenter: "Yardım merkezi",
      reportBug: "Hata bildir",
      terms: "Kullanım şartları",
      privacy: "Gizlilik politikası",
    },
    
    // Chat
    chat: {
      back: "Geri",
      clearChat: "Sohbeti temizle",
      typing: "Bahor AI yazıyor...",
      send: "Gönder",
      defaultChatTitle: "Yeni sohbet",
      chatHistory: "Sohbet geçmişi",
    },
    
    // Quick Suggestions
    suggestions: {
      general: [
        "Bana faydalı bir tavsiye ver",
        "Bugün ne öğrenebilirim?",
      ],
      tech: [
        "Bu kodu bana açıkla",
        "Programlamaya nereden başlamalıyım?",
      ],
      daily: [
        "Bugün akşam yemeği için ne pişirebilirim?",
        "Zamanımı daha iyi yönetmem için tavsiyeler ver",
      ],
      business: [
        "Küçük bir iş fikri öner",
        "Telegram/Instagram sayfam için içerik fikirleri ver",
      ],
      ielts: [
        "Bana IELTS Speaking sorusu sor",
        "İngilizce metnimi hatalar için kontrol et",
      ],
      homework: [
        "Bir matematik soruyu açıkla",
        "Bir formülü basitçe açıkla",
      ],
      job: [
        "CV / özgeçmişimi geliştirmeme yardım et",
        "İş görüşmesine hazırlanmama yardım et",
      ],
      financial: [
        "Basit bir aylık bütçe oluşturmama yardım et",
        "Faiz oranı nedir, sade bir şekilde açıkla",
      ],
      health: [
        "Bana bir egzersiz planı hazırla",
        "Sağlıklı beslenme hakkında tavsiye ver",
      ],
    },
    videoStudio: {
      title: "Video Stüdyosu",
      today: "bugün",
      premiumOnly: "Sadece Premium",
      freeBlocked: {
        title: "Video oluşturma sadece Premium'da",
        description: "Video oluşturmak için Premium'a yükseltin.",
        upgrade: "Premium'a yükselt",
      },
    },
    imageStudio: {
      freeUsage: "{used}/{limit} (filigranlı)",
      watermarkNotice: "Filigranlı",
    },
    imageStudioV2: {
      title: "Görsel Stüdyosu",
      subtitle: "Yapay zeka ile görseller oluşturun",
      rules: "Şiddet, cinsel veya politik içerik oluşturmak yasaktır.",
      modelLabel: "Model",
      model: {
        flux: "FLUX (Hızlı)",
        sdxl: "SDXL (Kaliteli)",
      },
      mode: {
        t2i: "Metinden Görsel",
        remix: "Remix",
        controlnet: "ControlNet",
      },
      comingSoon: "Yakında",
      controlnetComingSoon: "ControlNet yakında!",
      controlnetComingSoonDesc: "Bu özellik hâlâ geliştirilmektedir.",
      style: {
        realistic: "Gerçekçi",
        digitalArt: "Dijital Sanat",
        illustration: "İllüstrasyon",
        anime: "Anime",
        minimal: "Minimal",
      },
      sourceImageLabel: "Kaynak görsel",
      dropOrClick: "Görseli buraya sürükleyin veya tıklayın",
      maxFileSize: "Maks: {size}",
      error: "Hata",
      invalidFileType: "Sadece PNG, JPEG, WebP formatları kabul edilir",
      fileTooLarge: "Dosya boyutu 10MB'ı geçmemelidir",
      pleaseLogin: "Lütfen hesabınıza giriş yapın",
      premiumRequired: "Premium gerekli",
      sdxlPremiumOnly: "SDXL modeli sadece Premium kullanıcılar içindir",
      remixPremiumOnly: "Remix sadece Premium kullanıcılar içindir",
      remixRequiresImage: "Remix için görsel yükleyin",
      uploadFailed: "Görsel yüklenemedi",
      backendPending: "Beklemede",
      backendPendingDesc: "Bu özellik henüz hazır değil",
      success: "Başarılı!",
      imageSaved: "Görsel kaydedildi",
      downloadStarted: "İndirme başladı",
      promptLabel: "Açıklama (prompt)",
      promptPlaceholder: "Oluşturmak istediğiniz görseli tarif edin...",
      styleLabel: "Stil",
      aspectLabel: "En-boy oranı",
      renderLabel: "Render tipi",
      render: {
        photo: "Fotoğraf",
        illustration: "İllüstrasyon",
      },
      qualityBoost: "Kalite artırma",
      qualityBoostDesc: "Daha fazla adım (yavaş)",
      qualityBoostSdxl: "SDXL ile otomatik yüksek kalite",
      remixStrength: "Remix gücü",
      remixStrengthDesc: "Kaynak görsele ne kadar yakın",
      generate: "Oluştur",
      generating: "Oluşturuluyor...",
      result: "Sonuç",
      download: "İndir",
      open: "Aç",
      usedPrompt: "Kullanılan prompt",
      resizing: "Boyutlandırılıyor...",
      uploading: "Yükleniyor...",
      uploaded: "Yüklendi",
      uploadError: "Yükleme hatası",
    },
  },
} as const;

export function getTranslation(lang: Language) {
  return translations[lang];
}

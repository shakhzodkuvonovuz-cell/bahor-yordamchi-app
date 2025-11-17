# Bahor AI - Birinchi O'zbek Sun'iy Intellekti

Bahor AI is the first Uzbek AI assistant, designed to help with general questions, IELTS preparation, and homework assistance. This is the MVP v0 with dummy AI responses.

## Features

- **Mobile-first Progressive Web App (PWA)** - Can be installed on phones and tablets
- **Three chat modes:**
  - Umumiy suhbat (General Chat) - For any questions
  - IELTS va Ingliz tili (IELTS & English) - English learning and IELTS prep
  - Uy vazifasi va fanlar (Homework & Subjects) - Math, physics, and other subjects
- **Clean, modern UI** - Uzbek language by default
- **Offline support** - Basic caching with service worker
- **Responsive design** - Works on all screen sizes

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **PWA** - Progressive Web App capabilities

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd bahor-ai
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:8080`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ChatMessage.tsx
│   ├── ModeCard.tsx
│   └── QuickSuggestions.tsx
├── pages/            # Main application pages
│   ├── Welcome.tsx
│   ├── ModeSelection.tsx
│   ├── Chat.tsx
│   └── Settings.tsx
├── services/         # Business logic
│   └── dummyAiService.ts
├── types/            # TypeScript type definitions
│   └── chat.ts
├── data/             # Static data
│   └── modes.ts
└── App.tsx          # Main app component with routing
```

## PWA Installation

### On Android:
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. The app will open in standalone mode like a native app

### On iOS:
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear on your home screen

## Current Status (v0 - MVP)

This is a **test version** with dummy AI responses. The actual AI integration will be added in future versions.

### What's Working:
- ✅ Full navigation between all screens
- ✅ Three chat modes with different contexts
- ✅ Dummy AI responses simulating network delays
- ✅ Message history per session
- ✅ Quick suggestions for each mode
- ✅ Settings page (UI only, no persistence)
- ✅ PWA capabilities (installable, offline shell)

### What's Coming:
- 🔄 Real AI integration (DeepSeek or similar)
- 🔄 User authentication
- 🔄 Message persistence (save chat history)
- 🔄 Settings persistence
- 🔄 Multi-language support
- 🔄 Voice input
- 🔄 Image upload for homework help

## Replacing Dummy AI with Real API

The dummy AI logic is isolated in `src/services/dummyAiService.ts`. To integrate a real AI:

1. Replace the `getDummyAiResponseAsync` function with actual API calls
2. Update the function signature if needed (e.g., for streaming responses)
3. The rest of the UI will work with minimal changes

Example structure:
```typescript
// Real API version
export async function getAiResponse(
  mode: ChatMode, 
  userMessage: string
): Promise<string> {
  const response = await fetch('your-api-endpoint', {
    method: 'POST',
    body: JSON.stringify({ mode, message: userMessage })
  });
  return response.json();
}
```

## License

This project is private and proprietary.

## Contact

For questions or support, contact the Bahor AI team.

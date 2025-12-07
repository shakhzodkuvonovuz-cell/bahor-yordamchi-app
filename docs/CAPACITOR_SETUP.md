# Bahor AI - Capacitor Mobile App Setup

This guide explains how to build the Bahor AI APK for Android.

## Prerequisites

1. Node.js 18+
2. Android Studio with SDK installed
3. Git

## Supabase Auth Configuration

Before building, ensure these are configured in Supabase Dashboard:

### URL Configuration (Authentication → URL Configuration)

- **Site URL**: `https://www.bahorai.com`
- **Additional Redirect URLs** (add ALL):
  - `https://www.bahorai.com/*`
  - `http://localhost:5173/*`
  - `capacitor://localhost/*`
  - `bahorai://auth-callback`

### Google OAuth Provider

1. Enable Google in Authentication → Providers → Google
2. Configure in Google Cloud Console:
   - **Authorized redirect URI**: `https://akqtmyvwylfejbgwcyll.supabase.co/auth/v1/callback`

## Build Steps

### 1. Clone and Install

```bash
# Clone from your GitHub repo (after exporting from Lovable)
git clone <your-repo-url>
cd bahor-yordamchi-app
npm install
```

### 2. Initialize Capacitor (if not already done)

```bash
npx cap init "Bahor AI" "com.bahorai.app"
```

### 3. Add Android Platform

```bash
npx cap add android
```

### 4. Build the Web App

```bash
npm run build
```

### 5. Sync to Android

```bash
npx cap sync android
```

### 6. Open in Android Studio

```bash
npx cap open android
```

### 7. Verify AndroidManifest.xml

Ensure the deep link intent filter is present in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="bahorai" android:host="auth-callback" />
</intent-filter>
```

### 8. Build APK

In Android Studio:
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- Or for release: Build → Generate Signed Bundle / APK

## Deep Link Testing

Test the deep link handling:

```bash
# On connected device/emulator
adb shell am start -a android.intent.action.VIEW \
  -d "bahorai://auth-callback#access_token=test&refresh_token=test" \
  com.bahorai.app
```

## OAuth Flow

### Web Flow
1. User clicks "Google orqali kirish"
2. Redirect to Google OAuth
3. Redirect back to `https://www.bahorai.com/auth/callback`
4. Session established, navigate to `/modes`

### Android APK Flow
1. User clicks "Google orqali kirish"
2. System browser opens Google OAuth
3. After login, redirect to `bahorai://auth-callback#access_token=...`
4. Android intercepts deep link, opens Bahor AI app
5. App parses tokens, calls `supabase.auth.setSession()`
6. Browser closes, navigate to `/modes`

## Development Hot Reload

For development, the app is configured to load from:
`https://96e8fdf8-d2d3-4c09-a124-fe6906fc902b.lovableproject.com`

To disable this for production builds, comment out the `server` block in `capacitor.config.ts`:

```typescript
// For production, comment out this block:
// server: {
//   url: '...',
//   cleartext: true,
// },
```

## Troubleshooting

### "Network error" on production domain
- Clear browser cache and service worker
- Visit chrome://settings/cookies, search for bahorai.com, delete all

### OAuth not returning to app
- Verify deep link intent filter in AndroidManifest.xml
- Check `bahorai://auth-callback` is in Supabase redirect URLs
- Test deep link manually with adb command above

### Google OAuth error
- Verify Google provider is enabled in Supabase
- Check Google Cloud Console redirect URI matches Supabase

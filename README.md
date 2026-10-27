# Muslim Sweets Management System (MSMS) - মিষ্টির দোকান ব্যবস্থাপনা

MSMS is an offline-first, bilingual (English / বাংলা) sweet shop management system built with React 19, TypeScript, Vite, Tailwind CSS 4, and Capacitor 7 for Android 10+ (API 29 to 35).

---

## 🍬 Key Features

1. **100% Offline-First Architecture**
   - No internet connection required at any point.
   - Zero remote fonts, CDNs, or external tracking. All fonts use local system font stacks with full Bengali glyph support.
   - All store data resides locally in `localStorage` with native file export and system share via Capacitor Filesystem and Share plugins.

2. **Daily Sweet Shop Operations Checklist (Editable Task Categories)**
   - Complete daily checklist (e.g., milk purity testing, chana verification, sheera consistency, counter display, cash drawer balancing).
   - **Dynamic Categories**: Master Admin can add, rename, and delete category tabs (such as Kitchen, Counter, Hygiene, Accounts, or custom categories).
   - **Safety First**: When deleting a category containing tasks, prompts the admin to either reallocate tasks to another category or delete them.
   - Tasks and categories persist independently per shop branch.

3. **Multi-Shop Branch Management**
   - Seamless branch switcher with instant active store switching.
   - Comprehensive branch deletion cleanup: safely purges branch tasks, categories, and products.

4. **Bilingual Support (English & বাংলা)**
   - Single-tap language toggle across the top navigation bar.
   - Every sweet, product, category, task, and report has dual English and Bengali representations.

5. **Theme Support**
   - Refined dark emerald green theme and clean high-contrast light theme with unified theme tokens.

---

## 📱 Build & Install the Android APK

### Option 1: Automatic Download from GitHub Actions / Releases (Recommended)

1. Push code to your GitHub repository or navigate to the **Actions** tab on GitHub.
2. The **Build Android APK** workflow (`.github/workflows/build-apk.yml`) automatically triggers on push or `workflow_dispatch`.
3. In GitHub Actions:
   - Download the **`MSMS-debug-apk`** artifact, or
   - Download **`MSMS.apk`** attached to the `latest` Release.
4. Transfer `MSMS.apk` to any Android phone or tablet running Android 10 (API 29) or higher.
5. Tap the APK file to install (allow "Install from unknown sources" if prompted).

### Option 2: Build Locally with Android Studio / CLI

```bash
# 1. Install dependencies
npm install

# 2. Build web assets and sync native Capacitor Android project
npm run android:sync

# 3. Build APK with Gradle (requires Android SDK & Java 21)
cd android
./gradlew assembleDebug
```

The resulting APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔐 Update-Safe Keystore

MSMS includes a committed offline signing keystore (`android-signing/msms-debug.keystore`) configured in `android/app/build.gradle`. Any updates you install over an existing installation retain the same signature, preventing "App not installed as package appears to be corrupt" or signature mismatch errors.

---

## 💾 Backup & Restore

- Backups can be exported anytime via **Admin Settings** or the **Drive Sync** button in the header.
- On Android, the app saves `msms-backup-<timestamp>.json` using Capacitor Filesystem and opens the native Android Share sheet (Bluetooth, Drive, Nearby Share, Email, USB).
- Backups can be restored instantly on any device or browser running MSMS.

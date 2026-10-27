# Muslim Sweets Management System (MSMS) - Android Native Project

This directory contains the production-ready native Android project for MSMS using:
- **Language**: Kotlin 1.9+
- **UI Toolkit**: Jetpack Compose & Material 3 (2026 Android design)
- **Local Persistence**: Android Room Database (Offline-first, supports Decimal/Float stock quantities)
- **State & Architecture**: ViewModels, Repository pattern, and Kotlin StateFlow
- **Home Screen Widget**: Jetpack Glance AppWidget (`MSMSGlanceWidget.kt`)

## Building the Android APK

### Option 1: Instant Smartphone Installation (PWA)
Open the MSMS web app in Google Chrome on your Android smartphone and tap **"Install MSMS App on Android"** (or Chrome menu `⋮` -> **Add to Home screen**). It installs with standalone full-screen mode, home screen launcher icon, and offline support.

### Option 2: Build Native APK in Android Studio
1. Open **Android Studio** (Hedgehog or Ladybug / 2024.2+).
2. Click **File -> Open...** and select the `android/` directory.
3. Allow Gradle to sync dependencies.
4. Click **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
5. Once compiled, click **locate** to find `app-debug.apk`.
6. Transfer `app-debug.apk` to your Android device and tap to install!

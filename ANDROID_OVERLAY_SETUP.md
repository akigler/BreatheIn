# Android: Making the Breathe Screen Pop Up in Front of Apps

On Android, for the app to **detect when you open another app** (e.g. Instagram) and **show your Breathe screen in front**, two things are required:

---

## Prerequisites (for local Android build)

Building the Android app locally requires **JDK 17**. If you see *"Cannot find a Java installation matching: languageVersion=17"*:

**macOS (Homebrew):**
```bash
brew install openjdk@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Then run `npx expo run:android` again. To make JAVA_HOME permanent, add the `export` line to your `~/.zshrc` or `~/.bash_profile`.

1. **Detect app launches** – an **Accessibility Service** watches which app is in the foreground.
2. **Show your UI on top** – when a monitored app opens, **your app is brought to the front** with the Breathe overlay already visible (no “draw over other apps” overlay needed).

This repo implements that with an Expo config plugin and native Android code.

---

## How It Works

1. **You enable “Breathe before apps”** and pick apps (e.g. Instagram, Twitter) in Breathe In.
2. **You turn on the Breathe In Accessibility Service** in Android Settings (see below).
3. When you open one of those apps, the **Accessibility Service** sees it and **launches Breathe In** with a special link: `breathein://overlay?app_id=...&app_name=...`.
4. Breathe In opens **on top** of the other app and shows the **Breathing Overlay** (“Breathe”, timer, quote, Continue).
5. After you tap Continue (or Skip), you can go back to the other app.

So the “page that pops up in front” is **your app** being brought to the foreground with the overlay already visible; it’s not a separate system overlay.

---

## What You Need To Do

### 1. Use a development build (not Expo Go)

Expo Go **cannot** run an Accessibility Service or list your real installed apps. You must use a **dev client** build:

```bash
npx expo prebuild --clean
npx expo run:android
```

This builds the Android app with the native plugin, installs it on your device/emulator, and **launches that app**.

**Important:** After `npx expo run:android`, the app that opens on your device **is** the right one (it has the native code). If you later run `npx expo start` and want to test again, **open that same "Breathe In" app from your app drawer** — do **not** scan the QR code with the "Expo Go" app. Expo Go is a different app and will never show your real app list.

**Still seeing "Native app list not available"?**  
- If the log says *"You are in Expo Go"* → you opened Expo Go; close it and open the **Breathe In** app icon instead.  
- If you don’t see that message → run `npx expo run:android` again so the dev build is installed, then use the app that it launches.

#### Using the Android emulator (nothing pops up when you press “a”)

Pressing **a** in `npx expo start` does **not** start the emulator—it only runs the app on an already-running device or emulator. If no emulator is open, nothing will appear.

**To use the emulator:**

1. **Start the emulator first**
   - Open **Android Studio** → **Device Manager** (or **Tools → Device Manager**).
   - Click the **Play** button next to an Android Virtual Device (AVD), or create one if you don’t have any (e.g. Pixel 6, API 34).
   - Wait until the emulator window is fully booted and you see the home screen.

2. **Build and run the app on the emulator**
   - In your project folder, run:
     ```bash
     npx expo run:android
     ```
   - If both an emulator and a USB device are connected, choose the **emulator** when prompted.
   - This builds the app, installs it on the emulator, and launches Breathe In.

3. **After that**, you can use `npx expo start` and press **a** to reopen the app on the same emulator (with the emulator still running).

**Note:** On the emulator, “Restricted settings” for Accessibility may not appear, so you can usually enable Breathe In in **Settings → Accessibility** without the block you see on a physical device.

#### "There was a problem loading the project" (dev build can’t load the bundle)

The app is trying to load the JavaScript bundle from `localhost:8081`, but on your **phone** “localhost” is the phone itself—Metro is running on your **computer**. The dev client must connect to your computer’s Metro server.

1. **Start Metro on your computer** (in the project folder):
   ```bash
   npx expo start
   ```
   Leave this running. Note the URL it shows (e.g. `exp://192.168.1.5:8081`).

2. **Connect the dev client on your phone:**
   - **Same Wi‑Fi:** Phone and computer on the same network. Open the **Breathe In** app; if it shows “Enter URL” or a connection screen, type the `exp://…` URL from step 1 (use your computer’s IP, not localhost).
   - **Tunnel (if same Wi‑Fi doesn’t work):** On your computer run:
     ```bash
     npx expo start --tunnel
     ```
     Use the `exp://…` URL (or QR code) it prints. In the Breathe In app, enter that URL when it asks for a development server.

3. Tap **Reload** in the error screen after the app is pointed at the correct URL.

### 2. Enable the Breathe In Accessibility Service

**This is not the same as "All permissions" in app info.** The app does not need any extra permission from the "All permissions" screen (record audio, notifications, etc.) for the breathe-before-apps feature. It needs the **Accessibility** service to be turned on in a different place:

1. Open **Android Settings**.
2. Go to **Accessibility** (or **Settings → Accessibility**).  
   - On some devices: **Settings → Accessibility → Installed services** (or **Downloaded services**).
3. Find **Breathe In** in the list.
4. Tap **Breathe In**, then turn the switch **On** and accept the system prompt.

Until this is enabled, the app cannot detect when you open other apps.

#### "Restricted settings" / "For your security this setting is currently unavailable"

On **Android 13+** (and some manufacturers), if the app was **not** installed from the Play Store (e.g. you installed an EAS dev build or sideloaded the APK), Android may block enabling Accessibility with a message like *"Restricted settings – For your security this setting is currently unavailable."*

**What to try:**

1. **Allow the app in Restricted settings**  
   When you see that message, look for a link such as **"Settings"**, **"Allow"**, or **"Manage restricted settings"**. Tap it and allow **Breathe In** (or "apps from this source") so you can turn on the Accessibility service. The exact path varies by device (e.g. **Settings → Apps → Breathe In → Restricted settings** or similar).

2. **Install via Play Store (internal testing)**  
   If you upload the app to the Google Play Console and install it from an **internal testing** (or similar) track, Android often allows Accessibility without the restriction. This is the most reliable option for real devices.

3. **Use an emulator or different device**  
   Some emulators and older devices do not show this restriction; you can enable Accessibility there for development.

**In the app:** Open **Breathe Settings** and use the **"Open Accessibility Settings"** button under the Accessibility section to jump straight to the right screen.

### 3. Turn on “Breathe before apps” and choose apps

Inside Breathe In:

1. Enable the feature in app settings (e.g. “Breathe before apps”).
2. Select which apps should trigger the breathe screen (e.g. Instagram, Twitter).

The app will save this list and pass it to the Accessibility Service so it only intercepts those apps.

---

## Technical Summary

- **Expo config plugin** (`plugins/breathe-in-accessibility-plugin.js`) runs at prebuild and:
  - Adds the **Accessibility Service** to `AndroidManifest.xml`.
  - Adds **Kotlin** code: `BreatheInAccessibilityService` and a small **native module** so JS can call `setMonitoredPackages`, `hasPermissions`, `requestPermissions`, etc.
- **Deep link** `breathein://overlay?app_id=...&app_name=...` is registered in `app.json`. When the Accessibility Service opens the app with this URL, the app shows the Breathing Overlay.
- **App launch**: Root layout uses `Linking.getInitialURL()` (and optionally `Linking.addEventListener('url', ...)`) to detect `breathein://overlay` and set overlay visible with the right `app_id` / `app_name`.
- **Monitored apps**: When you start monitoring, the app calls the native module’s `setMonitoredPackages(selectedAppIds)` so the Accessibility Service only triggers for those packages.

After a clean prebuild or EAS build, the “pages pop up in front of apps” and “tell me to breathe” behavior works as long as the Accessibility Service is enabled and you’ve selected the apps you want to intercept.

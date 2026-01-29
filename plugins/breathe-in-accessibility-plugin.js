/**
 * Expo config plugin: Breathe In Accessibility Service (Android)
 *
 * Uses SYSTEM_ALERT_WINDOW to show a TRUE OVERLAY on top of other apps.
 * When the user opens a monitored app, we show a floating breathing overlay
 * directly on top - no app switching needed.
 */

const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.breathein.app';

function addAccessibilityServiceToManifest(mainApplication) {
  const service = {
    $: {
      'android:name': '.BreatheInAccessibilityService',
      'android:exported': 'false',
      'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
      'android:label': 'Breathe In',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.accessibilityservice',
          'android:resource': '@xml/accessibility_service_config',
        },
      },
    ],
  };

  // Add the overlay service
  const overlayService = {
    $: {
      'android:name': '.BreatheInOverlayService',
      'android:exported': 'false',
    },
  };

  if (!mainApplication.service) {
    mainApplication.service = [];
  }
  // Avoid duplicates
  const a11yExists = mainApplication.service.some(
    (s) => s.$?.['android:name'] === '.BreatheInAccessibilityService'
  );
  if (!a11yExists) {
    mainApplication.service.push(service);
  }
  const overlayExists = mainApplication.service.some(
    (s) => s.$?.['android:name'] === '.BreatheInOverlayService'
  );
  if (!overlayExists) {
    mainApplication.service.push(overlayService);
  }
  return mainApplication;
}

function withBreatheInAccessibilityManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    addAccessibilityServiceToManifest(mainApplication);

    // Add SYSTEM_ALERT_WINDOW permission
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const hasOverlayPerm = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
    );
    if (!hasOverlayPerm) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.SYSTEM_ALERT_WINDOW' },
      });
    }

    return config;
  });
}

// ==================== KOTLIN FILES ====================

const BreatheInAccessibilityServiceKt = `package com.breathein.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
import android.util.Log
import android.content.Context
import android.provider.Settings

class BreatheInAccessibilityService : AccessibilityService() {

    private var lastInterceptedPackage: String? = null
    private var lastInterceptTime: Long = 0

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return

        // Don't intercept our own overlay service or app
        if (packageName == getPackageName()) return

        // Cooldown: don't re-intercept the same package within 10 seconds
        val now = System.currentTimeMillis()
        if (packageName == lastInterceptedPackage && (now - lastInterceptTime) < 10000) {
            return
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(PREFS_KEY, "[]") ?: "[]"
        val packages = json
            .removeSurrounding("[", "]")
            .split(",")
            .map { it.trim().removeSurrounding("\\"") }
            .filter { it.isNotEmpty() }
        if (packages.isEmpty() || !packages.contains(packageName)) return

        // Check if we have overlay permission
        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "No overlay permission, skipping")
            return
        }

        // Record this interception
        lastInterceptedPackage = packageName
        lastInterceptTime = now

        val appName = try {
            packageManager.getApplicationInfo(packageName, 0).loadLabel(packageManager).toString()
        } catch (_: Exception) {
            packageName.substringAfterLast('.')
        }

        // Start the overlay service instead of launching the app
        val intent = Intent(this, BreatheInOverlayService::class.java).apply {
            putExtra("app_id", packageName)
            putExtra("app_name", appName)
        }
        startService(intent)
    }

    override fun onInterrupt() {}

    companion object {
        private const val TAG = "BreatheInA11y"
        const val PREFS_NAME = "BreatheInAccessibility"
        const val PREFS_KEY = "breathe_in_monitored_packages"
    }
}
`;

const BreatheInOverlayServiceKt = `package com.breathein.app

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

class BreatheInOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var breatheCircle: View? = null
    private var instructionText: TextView? = null
    private val handler = Handler(Looper.getMainLooper())
    private var breathePhase = 0 // 0=inhale, 1=hold, 2=exhale, 3=hold
    private var cycleCount = 0
    private val maxCycles = 3
    private var appId: String? = null
    private var appName: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        appId = intent?.getStringExtra("app_id")
        appName = intent?.getStringExtra("app_name") ?: "App"

        if (overlayView != null) {
            // Already showing, just update
            return START_NOT_STICKY
        }

        showOverlay()
        startBreathingAnimation()
        return START_NOT_STICKY
    }

    private fun showOverlay() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER

        // Create the overlay layout
        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#E6000000")) // Semi-transparent black
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }

        // App name chip at top
        val appChip = TextView(this).apply {
            text = appName
            setTextColor(Color.WHITE)
            textSize = 14f
            setPadding(32, 12, 32, 12)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#333333"))
                cornerRadius = 48f
            }
        }
        content.addView(appChip, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = 64 })

        // Breathing circle
        breatheCircle = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#00FFB8"))
            }
        }
        val circleSize = 180
        content.addView(breatheCircle, LinearLayout.LayoutParams(circleSize, circleSize).apply {
            gravity = Gravity.CENTER
            bottomMargin = 48
        })

        // "Breathe" title
        val titleText = TextView(this).apply {
            text = "Breathe"
            setTextColor(Color.WHITE)
            textSize = 32f
            gravity = Gravity.CENTER
        }
        content.addView(titleText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = 16 })

        // Instruction text
        instructionText = TextView(this).apply {
            text = "Breathe in..."
            setTextColor(Color.parseColor("#AAAAAA"))
            textSize = 16f
            gravity = Gravity.CENTER
        }
        content.addView(instructionText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = 48 })

        // Buttons container
        val buttonContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        // Skip button
        val skipButton = Button(this).apply {
            text = "Skip"
            setTextColor(Color.WHITE)
            textSize = 14f
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#444444"))
                cornerRadius = 48f
            }
            setPadding(48, 24, 48, 24)
            setOnClickListener { dismissOverlay() }
        }
        buttonContainer.addView(skipButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { rightMargin = 24 })

        // Continue button (shown after breathing completes)
        val continueButton = Button(this).apply {
            text = "Continue"
            setTextColor(Color.BLACK)
            textSize = 14f
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = 48f
            }
            setPadding(48, 24, 48, 24)
            visibility = View.GONE
            setOnClickListener { dismissOverlay() }
        }
        buttonContainer.addView(continueButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        content.addView(buttonContainer)

        container.addView(content, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        ))

        overlayView = container
        windowManager?.addView(overlayView, params)
    }

    private fun startBreathingAnimation() {
        breathePhase = 0
        cycleCount = 0
        animateBreatheCycle()
    }

    private fun animateBreatheCycle() {
        val circle = breatheCircle ?: return
        val instruction = instructionText ?: return

        when (breathePhase) {
            0 -> { // Inhale - grow
                instruction.text = "Breathe in..."
                circle.animate()
                    .scaleX(1.8f)
                    .scaleY(1.8f)
                    .setDuration(4000)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction {
                        breathePhase = 1
                        animateBreatheCycle()
                    }
                    .start()
            }
            1 -> { // Hold after inhale
                instruction.text = "Hold..."
                handler.postDelayed({
                    breathePhase = 2
                    animateBreatheCycle()
                }, 2000)
            }
            2 -> { // Exhale - shrink
                instruction.text = "Breathe out..."
                circle.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(4000)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .withEndAction {
                        breathePhase = 3
                        animateBreatheCycle()
                    }
                    .start()
            }
            3 -> { // Hold after exhale
                instruction.text = "Hold..."
                handler.postDelayed({
                    cycleCount++
                    if (cycleCount >= maxCycles) {
                        showContinueButton()
                    } else {
                        breathePhase = 0
                        animateBreatheCycle()
                    }
                }, 2000)
            }
        }
    }

    private fun showContinueButton() {
        val container = overlayView as? FrameLayout ?: return
        val content = container.getChildAt(0) as? LinearLayout ?: return
        val buttonContainer = content.getChildAt(content.childCount - 1) as? LinearLayout ?: return
        val continueButton = buttonContainer.getChildAt(1) as? Button ?: return
        
        instructionText?.text = "Great job! You can continue now."
        continueButton.visibility = View.VISIBLE
    }

    private fun dismissOverlay() {
        handler.removeCallbacksAndMessages(null)
        try {
            overlayView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.e("BreatheInOverlay", "Error removing overlay", e)
        }
        overlayView = null
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        dismissOverlay()
    }
}
`;

const BreatheInAccessibilityModuleKt = `package com.breathein.app

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.*

class BreatheInAccessibilityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BreatheInAccessibility"

    @ReactMethod
    fun setMonitoredPackages(packages: ReadableArray) {
        val list = ArrayList<String>()
        for (i in 0 until packages.size()) {
            val item = packages.getDynamic(i)
            if (item.type == ReadableType.String) {
                item.asString()?.let { list.add(it) }
            }
        }
        val prefs = reactApplicationContext.getSharedPreferences(
            BreatheInAccessibilityService.PREFS_NAME,
            android.content.Context.MODE_PRIVATE
        )
        val json = list.joinToString(",") { "\\"$it\\"" }
        prefs.edit().putString(BreatheInAccessibilityService.PREFS_KEY, "[$json]").apply()
    }

    @ReactMethod
    fun hasPermissions(promise: Promise) {
        try {
            val accessibilityEnabled = isAccessibilityServiceEnabled(reactApplicationContext)
            val overlayEnabled = Settings.canDrawOverlays(reactApplicationContext)
            // Both permissions are required
            promise.resolve(accessibilityEnabled && overlayEnabled)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun hasAccessibilityPermission(promise: Promise) {
        try {
            promise.resolve(isAccessibilityServiceEnabled(reactApplicationContext))
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactApplicationContext.packageName)
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) }
            val resolveInfo = pm.queryIntentActivities(intent, 0)
            val list = Arguments.createArray()
            val seen = mutableSetOf<String>()
            for (ri in resolveInfo) {
                val pkg = ri.activityInfo.packageName
                if (pkg == reactApplicationContext.packageName || pkg in seen) continue
                seen.add(pkg)
                val name = ri.loadLabel(pm).toString()
                val map = Arguments.createMap().apply {
                    putString("id", pkg)
                    putString("name", name)
                    putString("category", "other")
                }
                list.pushMap(map)
            }
            promise.resolve(list)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun launchApp(packageId: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageId)
            if (launchIntent == null) {
                promise.reject("ERR", "No launcher intent for package: " + packageId)
                return
            }
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
            reactApplicationContext.startActivity(launchIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissOverlay(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, BreatheInOverlayService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR", e.message, e)
        }
    }

    private fun isAccessibilityServiceEnabled(context: android.content.Context): Boolean {
        val serviceName = context.packageName + "/" + BreatheInAccessibilityService::class.java.name
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.split(":").any { it.trim() == serviceName }
    }
}
`;

const BreatheInAccessibilityPackageKt = `package com.breathein.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BreatheInAccessibilityPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(BreatheInAccessibilityModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

const ACCESSIBILITY_SERVICE_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagReportViewIds"
    android:canRetrieveWindowContent="false"
    android:notificationTimeout="100" />
`;

function withBreatheInAccessibilityNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;
      const pkgName = config.android?.package ?? PACKAGE_NAME;
      const pkg = pkgName.replace(/\./g, '/');
      const javaDir = path.join(platformRoot, 'app', 'src', 'main', 'java', pkg);
      const resXmlDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'xml');

      [javaDir, resXmlDir].forEach((dir) => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });

      const replacePkg = (s) => s.replace(/package com\.breathein\.app/g, `package ${pkgName}`);

      fs.writeFileSync(
        path.join(javaDir, 'BreatheInAccessibilityService.kt'),
        replacePkg(BreatheInAccessibilityServiceKt)
      );
      fs.writeFileSync(
        path.join(javaDir, 'BreatheInOverlayService.kt'),
        replacePkg(BreatheInOverlayServiceKt)
      );
      fs.writeFileSync(
        path.join(javaDir, 'BreatheInAccessibilityModule.kt'),
        replacePkg(BreatheInAccessibilityModuleKt)
      );
      fs.writeFileSync(
        path.join(javaDir, 'BreatheInAccessibilityPackage.kt'),
        replacePkg(BreatheInAccessibilityPackageKt)
      );
      fs.writeFileSync(
        path.join(resXmlDir, 'accessibility_service_config.xml'),
        ACCESSIBILITY_SERVICE_CONFIG_XML
      );

      const stringsPath = path.join(platformRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
      if (fs.existsSync(stringsPath)) {
        let strings = fs.readFileSync(stringsPath, 'utf8');
        if (!strings.includes('accessibility_service_description')) {
          const insert = '    <string name="accessibility_service_description">Breathe In uses this to show you a short breathing moment when you open selected apps.</string>\n';
          strings = strings.replace('</resources>', insert + '</resources>');
          fs.writeFileSync(stringsPath, strings);
        }
      }

      return config;
    },
  ]);
}

function addPackageToMainApplication(contents, packageName) {
  const pkg = packageName || PACKAGE_NAME;
  const importLine = `import ${pkg}.BreatheInAccessibilityPackage;`;
  if (contents.includes('BreatheInAccessibilityPackage')) return contents;
  const addImport = !contents.includes(importLine);
  let out = contents;
  if (addImport) {
    out = out.replace(
      /(import com\.facebook\.react\.ReactPackage;)/,
      `$1\n${importLine}`
    );
  }
  const patterns = [
    { from: /return\s+PackageList\s*\(\s*this\s*\)\s*\.\s*getPackages\s*\(\s*\)\s*;/,
      to: 'List<ReactPackage> packages = new PackageList(this).getPackages();\n      packages.add(new BreatheInAccessibilityPackage());\n      return packages;' },
    { from: /return\s+PackageList\s*\(\s*this\s*\)\s*\.\s*packages\s*;/,
      to: 'val packages = PackageList(this).packages.toMutableList(); packages.add(BreatheInAccessibilityPackage()); return packages;' },
    { from: /override\s+fun\s+getPackages\s*\(\s*\)\s*:\s*List\s*<\s*ReactPackage\s*>\s*=\s*PackageList\s*\(\s*this\s*\)\s*\.\s*packages/,
      to: 'override fun getPackages(): List<ReactPackage> = PackageList(this).packages.toMutableList().apply { add(BreatheInAccessibilityPackage()) }' },
  ];
  for (const { from, to } of patterns) {
    if (from.test(out)) {
      out = out.replace(from, to);
      break;
    }
  }
  return out;
}

function withBreatheInAccessibilityMainApplication(config) {
  return withMainApplication(config, (config) => {
    const pkg = config.android?.package ?? PACKAGE_NAME;
    config.modResults.contents = addPackageToMainApplication(config.modResults.contents, pkg);
    return config;
  });
}

function withBreatheInAccessibility(config) {
  config = withBreatheInAccessibilityManifest(config);
  config = withBreatheInAccessibilityNativeFiles(config);
  config = withBreatheInAccessibilityMainApplication(config);
  return config;
}

module.exports = withBreatheInAccessibility;

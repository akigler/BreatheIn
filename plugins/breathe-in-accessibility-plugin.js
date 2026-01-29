/**
 * Expo config plugin: Breathe In Accessibility Service (Android)
 *
 * Adds an Accessibility Service that detects when the user opens a monitored app
 * and launches Breathe In with the overlay deep link (breathein://overlay?app_id=...).
 * Also adds a native module so JS can set monitored packages and request permissions.
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

  if (!mainApplication.service) {
    mainApplication.service = [];
  }
  // Avoid duplicate
  const exists = mainApplication.service.some(
    (s) => s.$?.['android:name'] === '.BreatheInAccessibilityService'
  );
  if (!exists) {
    mainApplication.service.push(service);
  }
  return mainApplication;
}

function withBreatheInAccessibilityManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    addAccessibilityServiceToManifest(mainApplication);
    return config;
  });
}

const BreatheInAccessibilityServiceKt = `package com.breathein.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.net.Uri
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
import android.util.Log
import android.content.Context

class BreatheInAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(PREFS_KEY, "[]") ?: "[]"
        val packages = json
            .removeSurrounding("[", "]")
            .split(",")
            .map { it.trim().removeSurrounding("\\"") }
            .filter { it.isNotEmpty() }
        if (packages.isEmpty() || !packages.contains(packageName)) return
        val appName = try {
            packageManager.getApplicationInfo(packageName, 0).loadLabel(packageManager).toString()
        } catch (_: Exception) {
            packageName.substringAfterLast('.')
        }
        val uri = Uri.parse("breathein://overlay")
            .buildUpon()
            .appendQueryParameter("app_id", packageName)
            .appendQueryParameter("app_name", appName)
            .build()
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            setPackage(getPackageName())
        }
        try {
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch Breathe In", e)
        }
    }

    override fun onInterrupt() {}

    companion object {
        private const val TAG = "BreatheInA11y"
        const val PREFS_NAME = "BreatheInAccessibility"
        const val PREFS_KEY = "breathe_in_monitored_packages"
    }
}
`;

const BreatheInAccessibilityModuleKt = `package com.breathein.app

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
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
            val enabled = isAccessibilityServiceEnabled(reactApplicationContext)
            promise.resolve(enabled)
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
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(launchIntent)
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

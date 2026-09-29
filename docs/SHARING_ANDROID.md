# Share DevFlow with your team

Prepared 28 September 2026: release APK 1.0.4 (versionCode 5), package `com.devflow.team`, minimum Android API 24 and target API 36. Release assembly, release lint and client lint passed; APK Signature Scheme v2 verification passed with one signer. Package inspection showed no debuggable flag, and the APK contains no signing-store, signing-credentials, server `.env` or `devflow-fcm` files. The release APK has not yet been installed/tested on a phone; the owner's existing debug installation was left untouched.

## Send the app

The signed APK is generated at `releases/DevFlow-1.0.4.apk` in this repository. Share **only the APK** through your team's trusted channel or a private download link. The adjacent `.sha256` file is an optional integrity checksum, not a credential. No Play Store account is needed to prepare this file. Installation eligibility may depend on current Android developer-verification rules and the recipient's region/device.

Members should download the APK on an Android phone (Android 7 or newer), open it and, if prompted, allow installation from that specific browser/file app. They can turn that permission off again after installation. Do not disable Play Protect or bypass a developer-verification block; investigate any such warning first.

After installing, members sign into their own DevFlow account, accept the workspace invitation if needed, and select **Enable phone alerts** in the inbox. Installation does not create an account or grant workspace membership. The APK uses the existing HTTPS production backend and includes Firebase's Android client configuration, not backend service-account credentials.

## Existing test installation on the owner's phone

The phone currently has a debug-signed build. The release APK uses a new, private release key, so Android will not install it as an update over that debug build. Do not uninstall the test app without deciding to migrate: uninstalling removes local login/settings/drafts. Server-side teams/tasks remain on the server. When ready, turn off phone alerts and log out in the test app, uninstall it, install the release APK, then sign in and enable alerts again. No phone data was removed while preparing this release.

New teammates without the test build can install normally. Future release updates must use the same signing key and a higher versionCode; distribute the new APK and install it over the existing release rather than uninstalling.

## Keep the release key safe

The `.signing` folder at the repository root contains `devflow-release.jks` and `credentials.json`. Both are private, Git-ignored files. Keep a separate encrypted backup of both in a location you control. Do not send them to teammates, commit them, or attach them to a public release. Losing the key prevents signing compatible direct-distribution updates; someone with the key and password could impersonate the app's publisher.

## Build the next release

Increment `versionCode` and `versionName` in `client/android/app/build.gradle`. Set `JAVA_HOME` to JDK 21 and `ANDROID_HOME` to the Android SDK, then run from `client`:

```text
npm run android:release
```

The script reuses the existing private signing material, builds production Android web assets, syncs Capacitor, assembles and lints the signed release, verifies its signature, and copies a named APK plus SHA-256 checksum to `releases`. It does not upload anything or install/uninstall apps. `--init-signing` is only for the initial key creation; never replace the established key for an update.

Before broad sharing, test this release on a spare phone: login, workspace access, scrolling, return navigation, and opt-in notifications in foreground/background. Debug-build tests do not replace release-device testing.

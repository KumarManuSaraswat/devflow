# DevFlow for Android

## What is included

- A Capacitor 8 Android project in `client/android`, package ID **`com.devflow.team`**, using the same React screens and existing accounts as the website. Android opens directly to the team workspace/sign-in screen, not the advertising homepage.
- Bundled interface, DevFlow icon/splash, Android back-button behavior and HTTPS-only API access. No remote website is given access to the native plugin bridge.
- A notifications inbox on Android and the website. Tap an update to open its task or discussion; access is checked again by the server.
- Opt-in Firebase Cloud Messaging (FCM) notifications. Android permission is requested only when the member selects **Enable phone alerts** in **Notifications**. Signing out unlinks that phone before ending the session. This is not a PWA/browser notification implementation.
- Assignment alerts for assignees; review-request alerts for reviewers; review feedback for assignees; new discussion/feedback topics, replies and resolution alerts for active teammates. Your own actions do not alert you. Existing events are not backfilled.

## Current delivery status

Latest update (28 September 2026): **1.0.4 / versionCode 5** is installed on the owner's connected Redmi 13 5G, retaining app data and notification permission. ADB confirmed installation and a successful cold launch. The owner confirmed the 1.0.3 swipe fix works; the previously pending swipe confirmation below is now complete.

Version 1.0.4 adds an account-scoped, memory-only return-navigation cache for teams, workspace/project/task details, members, discussions, inbox and assistant context. Entries expire after five minutes and are capped at 60; restarting the app clears them. Revisits show saved content while making a fresh request. Successful mutations and access-denied/not-found responses clear saved entries; logout/account changes clear the scope, and generation checks prevent late requests repopulating invalidated entries. This is not offline authorization or a substitute for server access checks. Project/tasks and team/member reads now run in parallel where independent. No new service or paid plan is required; first loads and expired/invalidated entries still depend on backend availability.

Validation for 1.0.4: 61 server/utility tests and client lint passed; Android asset build/sync, APK assembly, scaffold unit test and Android lint passed. In an isolated browser fixture with four-second delays per API read, revisiting teams and inbox displayed cached content without a loader in approximately 50 ms (not a real-phone performance benchmark). Phone-level return-navigation confirmation remains pending. No production test messages or tasks were created, and no new notification was sent.

Earlier delivery history:

As of **28 September 2026**, debug APK **1.0.3 (versionCode 4)** is installed on the owner's Redmi 13 5G. The owner previously confirmed successful login. Android Studio, SDK platform 36/build tools and a separate Temurin JDK 21 are installed. The backend is deployed on Render, the notification database migration is applied, and `NOTIFICATIONS_ENABLED` and `PUSH_ENABLED` are both `true`. The project owner supplied the local Android Firebase configuration and stored the separate backend credential on Render; neither file belongs in Git. Gradle created a local development signing key for the test APK; no release signing key or paid account has been created.

Phone notification permission is granted and the device is registered with the backend. An initial Firebase `SERVICE_NOT_AVAILABLE` registration error cleared on retry; the specific cause was not established. On 26 September, one owner-approved private test notification was queued only for that device, accepted by FCM on its first attempt (`SENT`, no provider error), and subsequently marked read. The owner confirmed it appeared in the phone's notification shade while DevFlow was in the background. No task or team discussion was created or changed for this test. Event-specific and account-switch device tests remain outstanding. The 1.0.3 update retained Android notification permission; it did not change notification code or send another test alert.

Version 1.0.1 reduced native scrolling overhead through memoized message rows, a shared timestamp formatter, stable empty polls, and fewer decorative effects. After the owner confirmed that pausing motion helped, 1.0.2 made **Smooth mode** the Android default, independently of the website's saved animation preference. Members can still opt into animations.

Version 1.0.3 addresses the owner's remaining intermittent swipe-scroll problem with one native page viewport below the header. Chat history now scrolls with the rest of the page instead of inside a second vertical panel. Native form dialogs also have one vertical scroller. The closed navigation drawer is hidden, inert and non-interactive; opening it locks the page only until it closes. Discussion follow-latest and earlier-message anchoring target the appropriate native/web scroll container. Native touch panning and pinch zoom are retained, including horizontal task-board movement; no custom touch-drag handlers cancel gestures. Desktop bounded chat panels remain unchanged. The update was installed without clearing app data. Mobile-width browser checks passed, but real-phone confirmation that intermittent sticking is resolved is still pending.

The Android web build works without Firebase; in that case the phone-push control explains that setup is missing. Add the real configuration and rebuild before testing pushes. Never substitute sample Firebase credentials.

## 1. Firebase setup (project owner)

1. Create/use a Firebase project on the **Spark** plan. Do not attach billing or enable paid products for this feature. Analytics is not required and is disabled in this app.
2. Register an Android app with package name `com.devflow.team`. If you change this package ID before distribution, update the Capacitor config, Android namespace/application ID, Java package and build-script validation together, and register the matching Firebase Android app.
3. Download its **Android configuration** `google-services.json` to `client/android/app/google-services.json`. The file is ignored by Git. It is bundled into the APK by design; it is not an Admin SDK private key.
4. Enable Firebase Cloud Messaging HTTP v1 for that project. Set up server credentials with permission to send FCM messages (least-privilege Firebase Cloud Messaging API Admin role for a dedicated service account). Keep its private JSON key **only** in Render's secret configuration/secret file, never in the app, a `VITE_` variable, GitHub source, screenshots or chat.
5. Set **one** backend credential mechanism: `FIREBASE_SERVICE_ACCOUNT_JSON` as the private JSON environment value, or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a readable private secret file. The backend credentials and Android configuration must belong to the same Firebase project.

Official references: [Firebase Android setup](https://firebase.google.com/docs/cloud-messaging/android/get-started), [server credentials](https://firebase.google.com/docs/admin/setup), [FCM pricing](https://firebase.google.com/pricing).

## 2. Backend rollout

Keep `NOTIFICATIONS_ENABLED=false` and `PUSH_ENABLED=false` until the additive migration is applied to the actual production database. The flags default off, so simply deploying this code does not break the existing site or require new tables before rollout.

From `server`, after the normal database backup/review:

```sh
npm ci
npm run prisma:deploy
npm run prisma:generate
npm test
```

The migration `20260926120000_android_notifications` adds `Notification`, `PushDevice` and `PushDelivery` in a transaction; it does not alter existing team/task records. Then set:

```env
NOTIFICATIONS_ENABLED=true
PUSH_ENABLED=true
```

Configure the private Firebase credentials as above and deploy/restart Render with the new backend commit. The existing `npm install && npx prisma generate` Render build does **not** apply database migrations. Do not confuse pushing GitHub/Netlify with deploying Render: verify the backend's live commit too.

You can set `NOTIFICATIONS_ENABLED=true`, `PUSH_ENABLED=false` to use only the inbox. `/api/notifications/settings` reports setup availability to authenticated users without returning keys or tokens.

No extra worker service is needed. The existing Node process handles the outbox every 15 seconds. It uses database leases, retries transient errors with backoff up to six attempts, removes invalid device tokens and rechecks current membership and device ownership before sending. Pending pushes expire after seven days; already-read updates are skipped. Devices must refresh within 90 days (the app does so on sign-in/start).

Notifications and their delivery records are saved in the same database transaction as the originating task/message. Discussion retry keys prevent duplicate notifications. Push transport is **at least once**, not exactly once: a crash after FCM accepts a message may cause a retry. Stable Android notification tags reduce duplicate tray entries. There is no guaranteed instant delivery, and Render's free sleeping service cannot process its queue while stopped. It resumes when the server wakes. Network, Doze, force-stop and Android notification settings can delay/suppress alerts. The inbox remains the source of truth.

## 3. Build an APK

Install Android Studio 2025.2.1+ with **Android SDK 36**, platform/build tools and **JDK 21**. Use Node 22+. This project targets Android 16 / API 36, with Android 7 / API 24 as its minimum. Push requires Google Play services. See [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

Check the actual JDK version rather than assuming the newest Android Studio bundles Java 21. This project uses Gradle 8.14.3; Java 25 requires Gradle 9.1+, so use a separate JDK 21 for this project's Gradle runtime and compiler. In Android Studio, select it under **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**. For command-line builds, set `JAVA_HOME` for that terminal session only. See the [Gradle Java compatibility matrix](https://docs.gradle.org/current/userguide/compatibility.html). The SDK path belongs in the ignored `android/local.properties` file (or `ANDROID_HOME`), not a committed machine-specific setting.

From `client`:

```sh
npm ci
npm run android:sync
npm run android:open
```

The mobile build defaults to `https://devflow-api-fv4c.onrender.com`, independently of the web developer's local `.env`. To use a different HTTPS API origin, set `DEVFLOW_ANDROID_API_URL` before running `android:sync`. It must be an origin without `/api`; API calls append that path themselves. Cleartext URLs and credentials in URLs are rejected. The app retains the existing HTTP-only login cookie using Capacitor's native HTTP transport; no JWT is put in localStorage or Preferences.

In Android Studio, sync Gradle and run on an emulator/device with Google Play services. For a local test APK, use **Build APK(s)**, or run in `client/android` with the correct JDK/SDK configured:

```powershell
.\gradlew.bat assembleDebug
```

Output: `client/android/app/build/outputs/apk/debug/app-debug.apk`. A debug APK is for testing, not a signed release. For team distribution use **Generate Signed Bundle / APK → APK**, create/choose a private release keystore and keep a secure backup outside the repo. Never commit keystores or passwords. Every update must use the same application ID and signing key, with an increased `versionCode` in `android/app/build.gradle`. Re-run `android:sync` after frontend changes; installed apps do not automatically receive Netlify changes.

## Cost and distribution

FCM is a no-cost product, and this implementation uses your existing API/database instead of paid Firebase Functions or a separate notification service. Existing Render/Neon quotas and data storage still apply; notification rows accumulate, so monitor database usage. No billing plan was changed.

Do not assume a public Play Store release is free: [Google Play charges a one-time developer registration fee](https://support.google.com/googleplay/android-developer/answer/6112435). For a small group, check the current [free limited-distribution option (up to 20 authorized devices)](https://developer.android.com/developer-verification/guides/limited-distribution). Android developer-verification/distribution rules vary by region and are changing from September 2026; review them before sharing APKs. This implementation does not enroll the owner in a store, verification program or paid plan.

## Security and privacy

- Server-side authentication and current team membership protect inbox listing, unread counts, reads and opening destinations. Expired/future/deactivated members are excluded.
- FCM receives the device registration token, a generic "new team update" notification and an opaque notification ID. It does not receive task titles, teammate names, message bodies or feedback content. Notification taps resolve the real destination through the authenticated API.
- Device registration is scoped to the authenticated account. Tokens are not returned in inbox/device responses or logged. A shared phone's token transfer clears the old account's queued delivery records; disabling/logout removes its registration. Already-delivered/FCM-in-flight generic notifications may still exist briefly; Android delivered notifications are cleared on logout.
- Up to ten non-expired devices per account. Preferences store only opt-in state and server device IDs, not passwords, JWTs or FCM tokens. App backups and cleartext transport are disabled. Android 12+ extraction rules also explicitly exclude app storage from cloud backup and device-to-device transfer, so a new phone must sign in and opt in independently. No paid analytics SDK is enabled.
- Remaining dependency-audit warnings need follow-up before a public release: Prisma tooling has existing high-severity transitive advisories; Capacitor CLI's iOS-only `xcode` dependency reports a moderate `uuid` advisory, and Firebase's `gaxios` dependency also reports a moderate `uuid` advisory. Available non-breaking backend patches were applied. No forced Prisma downgrade or major override was made.

## Verification checklist before release

Automated tests cover event recipients, task/review hooks, rollback on queue failure, retry deduplication, inbox ownership and membership, token transfer, token expiry/removal, worker locking/backoff, private payloads, permission denial, logout races and safe tap routes.

Local checks completed: all 57 automated tests passed, client lint and production builds passed, Prisma schema validation previously passed, and Capacitor Android sync completed. The new tests cover platform-specific motion defaults and native/web discussion scroll-container selection. Earlier isolated checks covered inbox layout, unread counts and opening/marking a discussion update as read, plus discussion pagination, drafts and local fixture replies. On 28 September, 390px-wide browser checks verified that scrolling over message text, team cards, page margins, inbox items and assistant content moves the single native page viewport while document scroll stays at zero. Menu open/close restores scrolling and navigation resets the page offset. A 390x440 short-viewport check verified form content remains reachable through the outer dialog scroller. These browser checks use in-memory fixtures, not production data; browser scroll input is not a substitute for a real Android finger-swipe test.

Native build checks completed on 28 September 2026: `:app:assembleDebug`, `:app:testDebugUnitTest` and `:app:lintDebug` passed with JDK 21/Gradle 8.14.3. App lint reported **0 errors and 17 warnings** (dependency updates and generated/unused resources); the Java unit test is only the scaffold smoke test, not phone-level coverage. `apksigner verify` passed for the debug APK, and installed package metadata confirmed `com.devflow.team`, version 1.0.3, minimum API 24 and target API 36. ADB update installation succeeded on a Redmi 13 5G running Android 16 / HyperOS 3, and a cold launch of `MainActivity` returned `Status: ok` in approximately 2.3 seconds. The owner previously confirmed login and background notification delivery as recorded above. No instrumented device suite or controlled before/after scrolling benchmark was run. The APK, SDK path and Firebase configuration remain ignored by Git.

Remaining device tests before release:

1. Verify cookie persistence across restarts and logout; initial sign-in has been confirmed.
2. Alerts have been enabled on the owner's Android 16 phone. Deny permission on another device and confirm no token registration. Check Android 7–12 with OS notifications disabled as well (the plugin cannot report that OS setting on older Android).
3. From a second account, assign a task, submit a review and post feedback/messages. Check the inbox and foreground toast, then background/closed-app notifications. Do not use real sensitive test messages.
4. Tap a notification while signed in, signed out, or signed into another account. Only the rightful current member should access it.
5. Disable alerts, change accounts, deactivate membership and simulate an expired token. Ensure no subsequent private content is exposed and no old-account queue is sent to the new account.
6. Test cold starts, Android back, keyboard/composer, small displays, system-bar insets and connectivity loss. Confirm the resolved-discussion workflow still works on mobile.

The code is not a substitute for these real Firebase/device tests; successful web builds or mocked tests do not prove phone delivery.

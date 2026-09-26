# DevFlow for Android

## What is included

- A Capacitor 8 Android project in `client/android`, package ID **`com.devflow.team`**, using the same React screens and existing accounts as the website. Android opens directly to the team workspace/sign-in screen, not the advertising homepage.
- Bundled interface, DevFlow icon/splash, Android back-button behavior and HTTPS-only API access. No remote website is given access to the native plugin bridge.
- A notifications inbox on Android and the website. Tap an update to open its task or discussion; access is checked again by the server.
- Opt-in Firebase Cloud Messaging (FCM) notifications. Android permission is requested only when the member selects **Enable phone alerts** in **Notifications**. Signing out unlinks that phone before ending the session. This is not a PWA/browser notification implementation.
- Assignment alerts for assignees; review-request alerts for reviewers; review feedback for assignees; new discussion/feedback topics, replies and resolution alerts for active teammates. Your own actions do not alert you. Existing events are not backfilled.

## Current delivery status

The implementation and native project can be built/synced, but **an APK has not been compiled or tested on a real phone in this workspace**. Android Studio/SDK and JDK 21 are missing (the installed Java is 8). The project owner has supplied the local Android Firebase configuration and stored the separate backend credential on Render; neither file belongs in Git. Backend rollout must follow the migration and feature-flag sequence below. No signing key or paid account has been created.

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

Install Android Studio 2025.2.1+ with **Android SDK 36**, platform/build tools and its JDK 21. Use Node 22+. This project targets Android 16 / API 36, with Android 7 / API 24 as its minimum. Push requires Google Play services. See [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

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
- Up to ten non-expired devices per account. Preferences store only opt-in state and server device IDs, not passwords, JWTs or FCM tokens. App backups and cleartext transport are disabled. No paid analytics SDK is enabled.
- Remaining dependency-audit warnings need follow-up before a public release: Prisma tooling has existing high-severity transitive advisories; Capacitor CLI's iOS-only `xcode` dependency reports a moderate `uuid` advisory, and Firebase's `gaxios` dependency also reports a moderate `uuid` advisory. Available non-breaking backend patches were applied. No forced Prisma downgrade or major override was made.

## Verification checklist before release

Automated tests cover event recipients, task/review hooks, rollback on queue failure, retry deduplication, inbox ownership and membership, token transfer, token expiry/removal, worker locking/backoff, private payloads, permission denial, logout races and safe tap routes.

Local checks completed: all 49 automated tests passed, client lint and production builds passed, Prisma schema validation passed, and Capacitor Android sync completed. A 390px-wide browser check using an isolated in-memory backend verified inbox layout, unread counts and opening/marking a discussion update as read. These checks did not use or change production data.

Required device tests (not yet completed):

1. Sign in on Android, restart the app, and verify cookie persistence and logout.
2. Enable alerts on Android 13+; deny permission on another device and confirm no token registration. Check Android 7–12 with OS notifications disabled as well (the plugin cannot report that OS setting on older Android).
3. From a second account, assign a task, submit a review and post feedback/messages. Check the inbox and foreground toast, then background/closed-app notifications. Do not use real sensitive test messages.
4. Tap a notification while signed in, signed out, or signed into another account. Only the rightful current member should access it.
5. Disable alerts, change accounts, deactivate membership and simulate an expired token. Ensure no subsequent private content is exposed and no old-account queue is sent to the new account.
6. Test cold starts, Android back, keyboard/composer, small displays, system-bar insets and connectivity loss. Confirm the resolved-discussion workflow still works on mobile.

The code is not a substitute for these real Firebase/device tests; successful web builds or mocked tests do not prove phone delivery.

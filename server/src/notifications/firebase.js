const configured = (env = process.env) => env.NOTIFICATIONS_ENABLED === "true" && env.PUSH_ENABLED === "true"
  && Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS);
let messaging;
function getMessaging() {
  if (!configured()) throw new Error("Push is not configured");
  if (!messaging) {
    const { initializeApp, cert, applicationDefault } = require("firebase-admin/app");
    const { getMessaging: getFcm } = require("firebase-admin/messaging");
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
    messaging = getFcm(initializeApp({ credential }, "devflow-push"));
  }
  return messaging;
}

function pushPayload(device, notification) {
  // No names, task titles, message bodies or team IDs leave our backend.
  return { token: device.token,
    notification: { title: "DevFlow", body: "You have a new team update. Open DevFlow to view it." },
    data: { notificationId: notification.id },
    android: { priority: "high", ttl: 60 * 60 * 1000,
      notification: { channelId: "devflow_updates", icon: "ic_stat_devflow", color: "#2563EB", tag: notification.id, visibility: "private" } },
  };
}
async function sendPush(device, notification) { return getMessaging().send(pushPayload(device, notification)); }
module.exports = { configured, sendPush, pushPayload };

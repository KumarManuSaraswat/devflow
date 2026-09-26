import { isNotificationId } from '../utils/notifications.js';

export function createPushController({ isAndroid, pushInBuild, Preferences, PushNotifications, api, emit }) {
let activeUser;
let generation = 0;
let initialization;
let registering = Promise.resolve();
let waiter = null;
let state = { status: 'off', message: '' };
const subscribers = new Set();
const subscribePush = listener => { subscribers.add(listener); return () => subscribers.delete(listener); };
const getPushState = () => state;
const publish = (status, message = '') => { state = { status, message }; subscribers.forEach(listener => listener()); };
const consentKey = userId => `devflow:push-consent:${userId}`;
const deviceKey = userId => `devflow:push-device:${userId}`;
const ownerKey = 'devflow:push-owner';
const settled = error => { if (waiter) { clearTimeout(waiter.timer); error ? waiter.reject(error) : waiter.resolve(); waiter = null; } };

function initializePush() {
  if (!pushInBuild) return Promise.resolve();
  if (!initialization) initialization = (async () => {
    await PushNotifications.addListener('registration', ({ value }) => {
      const userId = activeUser;
      const version = generation;
      // Serialize refreshes and logout; never store the provider token in JS storage.
      registering = registering.catch(() => {}).then(async () => {
        if (!userId || version !== generation) return;
        if ((await Preferences.get({ key: consentKey(userId) })).value !== 'yes' || version !== generation) return;
        const { data } = await api.post('/notifications/devices', { token: value });
        if (version !== generation) {
          await api.delete(`/notifications/devices/${data.device.id}`); return;
        }
        await Preferences.set({ key: deviceKey(userId), value: data.device.id });
        await Preferences.set({ key: ownerKey, value: userId });
        if (version !== generation) return;
        publish('enabled', 'Phone notifications are enabled on this device.');
        settled();
      }).catch(() => {
        if (version !== generation) return;
        const error = new Error('Could not connect phone notifications. Check your connection and try again.');
        publish('error', error.message); settled(error);
      });
    });
    await PushNotifications.addListener('registrationError', () => {
      const error = new Error('Android could not register for notifications. Check Firebase setup and Google Play services.');
      publish('error', error.message); settled(error);
    });
    await PushNotifications.addListener('pushNotificationReceived', () => {
      if (activeUser) emit('devflow:notification-received');
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const id = notification.data?.notificationId;
      if (isNotificationId(id)) emit('devflow:open-notification', id);
    });
  })();
  return initialization;
}

async function enablePhoneAlerts(userId, prompt = true) {
  if (!pushInBuild) throw new Error('This Android build needs Firebase configuration before it can receive push notifications.');
  if (activeUser !== userId) throw new Error('Sign in again before enabling phone notifications.');
  const version = generation;
  const { data } = await api.get('/notifications/settings');
  if (!data.pushAvailable) throw new Error('Phone notifications are not configured on the server yet.');
  await initializePush();
  let permission = await PushNotifications.checkPermissions();
  if (prompt && ['prompt', 'prompt-with-rationale'].includes(permission.receive)) permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') throw new Error('Allow notifications in Android settings to receive phone alerts.');
  if (version !== generation) return;
  await PushNotifications.createChannel({ id: 'devflow_updates', name: 'Team updates', description: 'Assignments, feedback and discussions', importance: 4, visibility: 0, vibration: true });
  await Preferences.set({ key: consentKey(userId), value: 'yes' });
  publish('busy', 'Connecting this phone…');
  if (waiter) throw new Error('Notification registration is already in progress.');
  return new Promise((resolve, reject) => {
    waiter = { resolve, reject, timer: setTimeout(() => {
      const error = new Error('Registration is taking longer than expected. Please retry.');
      publish('error', error.message); settled(error);
    }, 20000) };
    PushNotifications.register().catch(() => {
      const error = new Error('Unable to register this device.');
      publish('error', error.message); settled(error);
    });
  });
}

async function setPushUser(userId) {
  if (!isAndroid || activeUser === userId) return;
  generation++;
  settled(new Error('Account changed.'));
  activeUser = userId;
  const version = generation;
  publish('off');
  const previousOwner = (await Preferences.get({ key: ownerKey })).value;
  if (previousOwner && previousOwner !== userId && version === generation) {
    // Also protect account switches after session expiry, when the old cookie cannot unlink the server row.
    if (pushInBuild) { await PushNotifications.unregister(); await PushNotifications.removeAllDeliveredNotifications(); }
    await Preferences.remove({ key: deviceKey(previousOwner) });
    await Preferences.remove({ key: consentKey(previousOwner) });
    await Preferences.remove({ key: ownerKey });
  }
  if (userId && pushInBuild && (await Preferences.get({ key: consentKey(userId) })).value === 'yes') {
    if (version !== generation) return;
    try { await enablePhoneAlerts(userId, false); } catch (error) { if (version === generation) publish('error', error.message); }
  }
}

async function disablePhoneAlerts(userId) {
  if (!isAndroid) return;
  generation++;
  settled(new Error('Phone notifications disabled.'));
  await Preferences.remove({ key: consentKey(userId) });
  await registering;
  const { value: deviceId } = await Preferences.get({ key: deviceKey(userId) });
  // Keep the user signed in if this fails, so the unlink can be retried safely.
  if (deviceId) await api.delete(`/notifications/devices/${deviceId}`);
  if (pushInBuild) {
    await PushNotifications.unregister();
    await PushNotifications.removeAllDeliveredNotifications();
  }
  await Preferences.remove({ key: deviceKey(userId) });
  await Preferences.remove({ key: ownerKey });
  publish('off', 'Phone notifications are off on this device.');
}
return { subscribePush, getPushState, initializePush, enablePhoneAlerts, setPushUser, disablePhoneAlerts };
}

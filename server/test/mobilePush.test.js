const test = require('node:test');
const assert = require('node:assert/strict');
async function fixture(overrides = {}) {
  const { createPushController } = await import('../../client/src/mobile/pushController.js');
  const values = new Map(); const listeners = {}; const calls = [];
  const options = { isAndroid: true, pushInBuild: true,
    Preferences: { get: async ({ key }) => ({ value: values.get(key) }), set: async ({ key, value }) => values.set(key, value), remove: async ({ key }) => values.delete(key) },
    PushNotifications: {
      addListener: async (event, callback) => { listeners[event] = callback; },
      checkPermissions: async () => ({ receive: 'prompt' }),
      requestPermissions: async () => { calls.push('permission'); return { receive: 'granted' }; },
      createChannel: async () => calls.push('channel'),
      register: async () => { calls.push('register'); listeners.registration({ value: 'fake-native-token' }); },
      unregister: async () => calls.push('unregister'), removeAllDeliveredNotifications: async () => calls.push('clear-tray'),
    },
    api: { get: async () => ({ data: { pushAvailable: true } }),
      post: async () => { calls.push('save-device'); return { data: { device: { id: 'c000000000000000000000001' } } }; },
      delete: async () => calls.push('delete-device') },
    emit: (...args) => calls.push(args),
  };
  Object.assign(options, overrides);
  const controller = createPushController(options);
  await controller.setPushUser('alice');
  return { controller, calls, values, listeners, options };
}
test('phone alerts require explicit consent and permission, then unregister before logout', async () => {
  const { controller, calls, values } = await fixture();
  assert.deepEqual(calls, []);
  await controller.enablePhoneAlerts('alice');
  assert.deepEqual(calls.slice(0, 4), ['permission', 'channel', 'register', 'save-device']);
  assert.equal(controller.getPushState().status, 'enabled');
  assert.ok(![...values.values()].includes('fake-native-token'));
  await controller.disablePhoneAlerts('alice');
  assert.deepEqual(calls.slice(-3), ['delete-device', 'unregister', 'clear-tray']);
  assert.equal(values.size, 0);
  assert.equal(controller.getPushState().status, 'off');
});
test('denied permission and missing Firebase setup do not register a token', async () => {
  const f = await fixture();
  f.options.PushNotifications.requestPermissions = async () => ({ receive: 'denied' });
  await assert.rejects(f.controller.enablePhoneAlerts('alice'), /Allow notifications/);
  assert.ok(!f.calls.includes('register'));
  const missing = await fixture({ pushInBuild: false });
  await assert.rejects(missing.controller.enablePhoneAlerts('alice'), /Firebase/);
});
test('registration failures are recoverable and backend unlink failure prevents unsafe logout', async () => {
  const f = await fixture();
  f.options.PushNotifications.register = async () => { throw new Error('Device failure'); };
  await assert.rejects(f.controller.enablePhoneAlerts('alice'), /Unable to register/);
  assert.equal(f.controller.getPushState().status, 'error');
  f.options.PushNotifications.register = async () => f.listeners.registration({ value: 'fake-native-token' });
  await f.controller.enablePhoneAlerts('alice');
  f.options.api.delete = async () => { throw new Error('Offline'); };
  await assert.rejects(f.controller.disablePhoneAlerts('alice'), /Offline/);
  assert.ok(!f.calls.includes('unregister'));
});
test('notification taps are restricted to IDs; foreground events do not expose message content', async () => {
  const f = await fixture(); await f.controller.initializePush();
  f.listeners.pushNotificationActionPerformed({ notification: { data: { notificationId: 'https://evil.example' } } });
  assert.deepEqual(f.calls, []);
  f.listeners.pushNotificationActionPerformed({ notification: { data: { notificationId: 'c000000000000000000000001' } } });
  assert.deepEqual(f.calls[0], ['devflow:open-notification', 'c000000000000000000000001']);
  f.listeners.pushNotificationReceived({ body: 'private text' });
  assert.deepEqual(f.calls[1], ['devflow:notification-received']);
});
test('switching account after an expired session unregisters the previous phone identity', async () => {
  const f = await fixture(); await f.controller.enablePhoneAlerts('alice');
  await f.controller.setPushUser('bob');
  assert.ok(f.calls.includes('unregister'));
  assert.ok(f.calls.includes('clear-tray'));
  assert.equal(f.values.size, 0);
  assert.equal(f.controller.getPushState().status, 'off');
});
test('an in-flight registration is removed if the user signs out while it is being saved', async () => {
  const f = await fixture();
  let release;
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  f.options.api.post = () => { entered(); return new Promise(resolve => { release = resolve; }); };
  const enabling = f.controller.enablePhoneAlerts('alice');
  const rejected = assert.rejects(enabling, /disabled/);
  await started;
  const disabling = f.controller.disablePhoneAlerts('alice');
  release({ data: { device: { id: 'c000000000000000000000001' } } });
  await disabling; await rejected;
  assert.ok(f.calls.includes('delete-device'));
  assert.equal(f.controller.getPushState().status, 'off');
});

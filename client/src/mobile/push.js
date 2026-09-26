import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../api/axios';
import { createPushController } from './pushController';

export const isAndroid = Capacitor.getPlatform() === 'android';
export const pushInBuild = isAndroid && import.meta.env.VITE_NATIVE_PUSH_ENABLED === 'true';
export const { subscribePush, getPushState, initializePush, enablePhoneAlerts, setPushUser, disablePhoneAlerts } = createPushController({
  isAndroid, pushInBuild, Preferences, PushNotifications, api,
  emit: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })),
});

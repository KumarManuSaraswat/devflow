export const isNotificationId = value => typeof value === 'string' && /^c[a-z0-9]{24,}$/.test(value);
export const safeNotificationPath = value => typeof value === 'string'
  && /^\/(tasks\/c[a-z0-9]+|teams\/c[a-z0-9]+\/discussions\/c[a-z0-9]+)$/.test(value) ? value : '/notifications';

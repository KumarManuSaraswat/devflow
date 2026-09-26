import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const url = new URL(process.env.DEVFLOW_ANDROID_API_URL || 'https://devflow-api-fv4c.onrender.com');
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('DEVFLOW_ANDROID_API_URL must be an HTTPS origin, without credentials or a path.');
}
const firebaseFile = path.join(root, 'android/app/google-services.json');
const withPush = existsSync(firebaseFile);
if (withPush) {
  const firebase = JSON.parse(readFileSync(firebaseFile, 'utf8'));
  if (!firebase.client?.some(client => client.client_info?.android_client_info?.package_name === 'com.devflow.team')) {
    throw new Error('google-services.json must contain the Android package com.devflow.team.');
  }
} else {
  console.warn('Building without phone push: add android/app/google-services.json and rebuild to enable it.');
}
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'android', '--outDir', 'dist-android'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, VITE_API_URL: url.origin, VITE_NATIVE_PUSH_ENABLED: String(withPush) },
});
process.exit(result.status ?? 1);

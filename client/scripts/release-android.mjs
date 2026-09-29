import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const client = fileURLToPath(new URL('../', import.meta.url));
const root = path.dirname(client.replace(/[\\/]$/, ''));
const privateDir = path.join(root, '.signing');
const store = path.join(privateDir, 'devflow-release.jks');
const credentials = path.join(privateDir, 'credentials.json');
const java = process.env.JAVA_HOME;
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!java || !sdk) throw new Error('Set JAVA_HOME (JDK 21) and ANDROID_HOME first.');
const windows = process.platform === 'win32';
function run(command, args, env = process.env, cwd = client) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build step failed (${result.status}).`);
}
if (!existsSync(store) && !existsSync(credentials)) {
  if (!process.argv.includes('--init-signing')) throw new Error('First release: run npm run android:release -- --init-signing. Back up .signing privately.');
  mkdirSync(privateDir, { recursive: true });
  const password = randomBytes(32).toString('hex');
  writeFileSync(credentials, JSON.stringify({ password }), { flag: 'wx', mode: 0o600 });
  run(path.join(java, 'bin', windows ? 'keytool.exe' : 'keytool'), [
    '-genkeypair', '-keystore', store, '-storetype', 'JKS', '-alias', 'devflow-release',
    '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
    '-dname', 'CN=DevFlow Release', '-storepass:env', 'DEVFLOW_SIGNING_PASSWORD',
    '-keypass:env', 'DEVFLOW_SIGNING_PASSWORD', '-noprompt',
  ], { ...process.env, DEVFLOW_SIGNING_PASSWORD: password });
}
if (!existsSync(store) || !existsSync(credentials)) throw new Error('Incomplete signing material. Restore your private backup; do not replace an existing release key.');
const { password } = JSON.parse(readFileSync(credentials, 'utf8'));
if (typeof password !== 'string' || !password) throw new Error('Invalid signing credentials.');
const env = { ...process.env, DEVFLOW_SIGNING_STORE: store, DEVFLOW_SIGNING_PASSWORD: password };
run(process.execPath, ['scripts/build-android.mjs']);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android']);
const android = path.join(client, 'android');
if (windows) run('cmd.exe', ['/d', '/c', 'gradlew.bat :app:assembleRelease :app:lintRelease'], env, android);
else run('./gradlew', [':app:assembleRelease', ':app:lintRelease'], env, android);
const apk = path.join(android, 'app/build/outputs/apk/release/app-release.apk');
const buildTools = readdirSync(path.join(sdk, 'build-tools')).filter(v => /^\d+\.\d+\.\d+$/.test(v))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
if (!buildTools) throw new Error('Android SDK build tools are missing.');
const signer = path.join(sdk, 'build-tools', buildTools, 'lib', 'apksigner.jar');
run(path.join(java, 'bin', windows ? 'java.exe' : 'java'), ['-jar', signer, 'verify', '--verbose', apk]);
const version = JSON.parse(readFileSync(path.join(path.dirname(apk), 'output-metadata.json'), 'utf8')).elements[0].versionName;
const output = path.join(root, 'releases');
mkdirSync(output, { recursive: true });
const destination = path.join(output, `DevFlow-${version}.apk`);
copyFileSync(apk, destination);
const hash = createHash('sha256').update(readFileSync(destination)).digest('hex');
writeFileSync(`${destination}.sha256`, `${hash}  ${path.basename(destination)}\n`);
console.log(`Release ready: ${destination}\nKeep .signing private and backed up. Share only the APK, never signing credentials.`);

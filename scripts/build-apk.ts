/**
 * Reusable build script for Newtown Express Android TWA APK.
 * Automatically increments versionCode, rebuilds with Gradle,
 * signs with external keystore, and updates Firestore version doc.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PROJECT_DIR = '/home/dayshift/.android/twa-project';
const KEYSTORE_PATH = '/home/dayshift/.android/newtown-express.keystore';
const KEY_ALIAS = 'newtown';
const KEY_PASS = 'newtown_express_2026';

function main() {
  const versionPath = path.join(ROOT_DIR, 'version.json');
  if (!fs.existsSync(versionPath)) {
    throw new Error('version.json not found!');
  }

  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const oldCode = versionData.versionCode || 1;
  const newCode = oldCode + 1;
  versionData.versionCode = newCode;
  versionData.lastBuiltAt = new Date().toISOString();

  console.log(`\n📦 Incrementing Android release: versionCode ${oldCode} -> ${newCode} (versionName: ${versionData.versionName})`);
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

  // Update app/build.gradle versionCode
  const buildGradlePath = path.join(PROJECT_DIR, 'app/build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${newCode}`);
    fs.writeFileSync(buildGradlePath, gradleContent);
    console.log(`Updated versionCode in ${buildGradlePath}`);
  }

  // Update twa-manifest.json
  const twaManifestPath = path.join(PROJECT_DIR, 'twa-manifest.json');
  if (fs.existsSync(twaManifestPath)) {
    const twaManifest = JSON.parse(fs.readFileSync(twaManifestPath, 'utf8'));
    twaManifest.appVersionCode = newCode;
    fs.writeFileSync(twaManifestPath, JSON.stringify(twaManifest, null, 2));
    console.log(`Updated appVersionCode in ${twaManifestPath}`);
  }

  console.log('\n🔨 Compiling release APK with Gradle...');
  execSync('./gradlew assembleRelease --stacktrace', {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      JAVA_HOME: '/home/dayshift/.bubblewrap/jdk/jdk-17.0.11+9',
      ANDROID_HOME: '/home/dayshift/.bubblewrap/android_sdk',
    },
  });

  const unsignedApk = path.join(PROJECT_DIR, 'app/build/outputs/apk/release/app-release-unsigned.apk');
  const signedApk = path.join(PROJECT_DIR, 'app-release-signed.apk');

  if (fs.existsSync(unsignedApk)) {
    console.log('\n✍️ Signing APK with release keystore...');
    execSync(
      `jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "${KEYSTORE_PATH}" -storepass "${KEY_PASS}" -keypass "${KEY_PASS}" -signedjar "${signedApk}" "${unsignedApk}" "${KEY_ALIAS}"`,
      { stdio: 'inherit' }
    );
  }

  console.log('\n📋 Copying signed APK to public folder...');
  fs.copyFileSync(signedApk, path.join(ROOT_DIR, 'public/newtown-express.apk'));

  console.log('\n🚀 Syncing Firestore appConfig document...');
  execSync('npx tsx scripts/publish-apk.ts', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  console.log(`\n🎉 Build complete! Android versionCode ${newCode} published.`);
}

main();

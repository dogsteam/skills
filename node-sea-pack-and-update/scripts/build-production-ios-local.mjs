#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const buildDir = join(projectRoot, 'build');
const archivePath = join(buildDir, 'XeChung.xcarchive');
const ipaDir = join(buildDir, 'ipa');

const targetName = 'XeChung';
const workspacePath = 'ios/XeChung.xcworkspace';

// 1. Đọc phiên bản và build number từ Info.plist hoặc env
const infoPlistPath = join(projectRoot, `ios/${targetName}/Info.plist`);
let defaultVersion = '0.1.0';
let defaultBuild = '1';
if (existsSync(infoPlistPath)) {
  const content = readFileSync(infoPlistPath, 'utf8');
  const vMatch = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
  const bMatch = content.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
  if (vMatch) defaultVersion = vMatch[1];
  if (bMatch) defaultBuild = bMatch[1];
}

const appVersion = process.env.APP_VERSION || defaultVersion;
const buildNumber = process.env.IOS_BUILD_NUMBER || defaultBuild;

console.log(`🚀 [Xe Chung] Bắt đầu quy trình biên dịch iOS cục bộ (Target: ${targetName})...`);

const teamId = process.env.APPLE_TEAM_ID || 'SQ6JB49KXQ';
const bundleId = process.env.IOS_BUNDLE_IDENTIFIER || 'com.xechung.app';
const certIdentity = process.env.APPLE_CERT_IDENTITY || 'iPhone Distribution: Trương  Hiệp (SQ6JB49KXQ)';
const profileUuid = process.env.APPLE_PROVISIONING_PROFILE_UUID || '74e2406e-6c8a-4614-8678-df8d6146fc18';
const keychainPath = join(projectRoot, 'test.keychain');
const keychainPass = 'testpass';

console.log(`🔐 Sử dụng Chữ ký số: ${certIdentity}`);
console.log(`📱 Bundle ID: ${bundleId} (Version ${appVersion} / Build ${buildNumber})`);
console.log(`📜 Provisioning Profile UUID: ${profileUuid}`);
console.log(`👥 Team ID: ${teamId}`);
console.log(`🗝️ Build Keychain: ${keychainPath}`);

// Mở khóa keychain và đưa vào danh sách tìm kiếm
try {
  if (existsSync(keychainPath)) {
    execSync(`security unlock-keychain -p "${keychainPass}" "${keychainPath}"`, { stdio: 'ignore' });
    execSync(`security set-keychain-settings -t 3600 "${keychainPath}"`, { stdio: 'ignore' });
    execSync(`security list-keychains -d user -s "${keychainPath}" /Users/macs/Library/Keychains/login.keychain-db /Library/Keychains/System.keychain`, { stdio: 'ignore' });
    console.log('✅ Đã mở khóa Build Keychain thành công.');
  }
} catch (e) {
  console.warn('⚠️ Cảnh báo thiết lập keychain:', e.message);
}

// 2. Tạo thư mục build & exportOptions.plist
if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });

const exportOptionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>${teamId}</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>${certIdentity}</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>${bundleId}</key>
        <string>${profileUuid}</string>
    </dict>
    <key>destination</key>
    <string>export</string>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>`;

const plistPath = join(buildDir, 'exportOptions.plist');
writeFileSync(plistPath, exportOptionsPlist, 'utf8');
console.log(`📄 Đã tạo exportOptions.plist tại: ${plistPath}`);

// 3. Biên dịch xcodebuild archive
console.log('🔨 Đang chạy xcodebuild archive...');
const signArgs = `CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="${teamId}" PROVISIONING_PROFILE_SPECIFIER="${profileUuid}" CODE_SIGN_IDENTITY="${certIdentity}" OTHER_CODE_SIGN_FLAGS="--keychain ${keychainPath}"`;

const archiveCmd = `xcodebuild -workspace "${workspacePath}" -scheme "${targetName}" -configuration Release -archivePath "${archivePath}" ${signArgs} -destination 'generic/platform=iOS' clean archive`;

const buildEnv = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://103.74.103.77:1994',
  APP_VERSION: appVersion,
  IOS_BUILD_NUMBER: buildNumber,
  IOS_BUNDLE_IDENTIFIER: bundleId,
};

execSync(archiveCmd, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv,
});

// 4. Xuất file IPA
console.log('📦 Đang xuất file .ipa từ xcarchive...');
const exportCmd = `xcodebuild -exportArchive -archivePath "${archivePath}" -exportPath "${ipaDir}" -exportOptionsPlist "${plistPath}"`;

execSync(exportCmd, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv,
});

const builtIpaPath = join(ipaDir, `${targetName}.ipa`);
if (!existsSync(builtIpaPath)) {
  console.error(`❌ Không tìm thấy file IPA tại: ${builtIpaPath}`);
  process.exit(1);
}

const targetIpaName = `XeChung-iOS-v${appVersion}-b${buildNumber}.ipa`;
const destIpaPath = join(projectRoot, targetIpaName);
copyFileSync(builtIpaPath, destIpaPath);

console.log(`\n🎉 HOÀN THÀNH BIÊN DỊCH: File IPA đã sẵn sàng tại:`);
console.log(`👉 ${destIpaPath}\n`);

// 5. Kích hoạt tiến trình upload và submit
console.log('🚀 Chuyển sang quy trình Upload & Submit App Store...');
try {
  execSync(`node scripts/auto-upload-and-submit.mjs "${destIpaPath}"`, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: buildEnv,
  });
} catch (e) {
  console.error('⚠️ Lỗi ở bước upload / submit:', e.message);
}

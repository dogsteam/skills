#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const androidDir = join(projectRoot, 'android');
const distDir = join(projectRoot, 'dist', 'android');
const downloadsDir = resolve(projectRoot, '..', 'ShipTuDo-Downloads');

console.log('🚀 [XeChung] Bắt đầu quy trình biên dịch APK Android...');

// 1. Kiểm tra thư mục Android
if (!existsSync(androidDir)) {
  console.log('⚠️ Thư mục android/ chưa được tạo qua prebuild. Hãy chạy `npx expo prebuild --platform android` trước.');
  process.exit(1);
}

// 2. Tìm JDK 17
let javaHome = process.env.JAVA_HOME;
if (!javaHome || !existsSync(join(javaHome, 'bin', 'javac'))) {
  const brewJdk17Base = '/opt/homebrew/Cellar/openjdk@17';
  if (existsSync(brewJdk17Base)) {
    const versions = readdirSync(brewJdk17Base);
    if (versions.length > 0) {
      javaHome = join(brewJdk17Base, versions[0], 'libexec', 'openjdk.jdk', 'Contents', 'Home');
    }
  }
}

if (!javaHome || !existsSync(join(javaHome, 'bin', 'javac'))) {
  console.error('❌ Không tìm thấy JDK 17! Vui lòng kiểm tra openjdk@17');
  process.exit(1);
}
console.log(`☕ Sử dụng JAVA_HOME: ${javaHome}`);

// 3. Tìm Android SDK
let androidHome = process.env.ANDROID_HOME || join(process.env.HOME || '', 'Library', 'Android', 'sdk');
if (!existsSync(androidHome)) {
  console.error(`❌ Không tìm thấy Android SDK tại: ${androidHome}`);
  process.exit(1);
}
console.log(`📱 Sử dụng ANDROID_HOME: ${androidHome}`);

const pkgJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const version = pkgJson.version || '0.1.0';
const buildNumber = 'b22';

console.log(`🏷️  Phiên bản ứng dụng: v${version}-${buildNumber}`);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  PATH: `${join(javaHome, 'bin')}:${process.env.PATH}`,
};

console.log('🧹 Xóa bộ nhớ đệm đóng gói APK cũ...');
try {
  execSync('rm -rf android/app/build/intermediates/apk/ android/app/build/intermediates/package_and_split_resources_options/', {
    cwd: projectRoot,
    stdio: 'ignore',
  });
} catch (_) {}

console.log('🔨 Đang chạy Gradle assembleRelease...');
execSync('./gradlew assembleRelease', {
  cwd: androidDir,
  env,
  stdio: 'inherit',
});

const builtApkPath = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(builtApkPath)) {
  console.error(`❌ Không tìm thấy file APK tại: ${builtApkPath}`);
  process.exit(1);
}

const targetApkName = `XeChung-android-v${version}-${buildNumber}.apk`;
console.log(`📦 Đã biên dịch xong: ${targetApkName}`);

// Tạo distDir nếu chưa có
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

// Copy vào dist/android và root
const destDistApk = join(distDir, targetApkName);
copyFileSync(builtApkPath, destDistApk);
copyFileSync(builtApkPath, join(projectRoot, targetApkName));
console.log(`✅ Đã lưu APK tại: ${destDistApk}`);

// Đồng bộ sang repo git: ShipTuDo-Downloads
if (existsSync(downloadsDir)) {
  console.log(`📂 Đang đồng bộ vào kho phân phối: ${downloadsDir}...`);

  // Copy ghi đè bản APK mới vào (giữ cả bản b14, b13 và XeChung-latest.apk để tránh lỗi 404 link cũ)
  const destDownloadApk = join(downloadsDir, targetApkName);
  copyFileSync(builtApkPath, destDownloadApk);
  copyFileSync(builtApkPath, join(downloadsDir, `XeChung-android-v${version}-b15.apk`));
  copyFileSync(builtApkPath, join(downloadsDir, `XeChung-android-v${version}-b14.apk`));
  copyFileSync(builtApkPath, join(downloadsDir, 'XeChung-latest.apk'));
  console.log(`  + Đã ghi đè APK mới nhất: ${targetApkName} (kèm b14, b13 & XeChung-latest.apk)`);

  // Nén lại gói Server zip nếu có thư mục EXE mới build
  const winDir = join(projectRoot, 'dist', 'windows', `XeChungServer-${version}`);
  const serverZip = join(projectRoot, `XeChungServer-${version}-win-x64.zip`);
  if (existsSync(winDir)) {
    try {
      execSync(`zip -r "${serverZip}" XeChungServer.exe XeChungServer.env`, { cwd: winDir, stdio: 'ignore' });
      console.log(`  + Đã nén lại gói Server ZIP mới nhất: XeChungServer-${version}-win-x64.zip`);
    } catch (zipErr) {
      console.warn(`  ! Không thể nén zip: ${zipErr.message}`);
    }
  }

  if (existsSync(serverZip)) {
    copyFileSync(serverZip, join(downloadsDir, `XeChungServer-${version}-win-x64.zip`));
    console.log(`  + Đã copy Server ZIP vào downloads: XeChungServer-${version}-win-x64.zip`);
  }

  // Cập nhật README.md của ShipTuDo-Downloads
  let readme = readFileSync(join(downloadsDir, 'README.md'), 'utf8');
  const xeChungSection = `### 🚗 Ứng dụng Xe Chung (Xe Ghép & Giao Hàng Thái Nguyên - Hà Nội)

Tải bản Android mới nhất:
- **[${targetApkName}](https://github.com/dogsteam/ShipTuDo-Downloads/raw/main/${targetApkName})**
  - **Phiên bản:** \`v${version}-${buildNumber}\`
  - **Dịch vụ:** Ghép ghế 150k, Bao xe 4/7 chỗ, Gửi hàng cốp 70k, Sàn cuốc ẩn SĐT & trượt nhận cuốc.
  - **Tính năng mới:** Tích hợp Bản đồ số tương tác (Interactive Map Picker), tìm kiếm địa chỉ thông minh (Goong + OSM), ghim vị trí đón/trả trực quan chuẩn phong cách ShipTuDo, đăng ký lịch chạy tài xế, tự động khớp khách, kho chuông âm thanh từ server, ví 2 ngăn (Deposit + Thưởng), kịch bản thông báo AI thông minh.

Máy chủ Windows Server (Port 1994):
- **[XeChungServer-${version}-win-x64.zip](https://github.com/dogsteam/ShipTuDo-Downloads/raw/main/XeChungServer-${version}-win-x64.zip)**`;

  if (readme.includes('### 🚗 Ứng dụng Xe Chung')) {
    readme = readme.replace(/### 🚗 Ứng dụng Xe Chung[\s\S]*?(?=(### |$))/, xeChungSection + '\n');
  } else {
    readme += `\n\n---\n\n${xeChungSection}\n`;
  }
  writeFileSync(join(downloadsDir, 'README.md'), readme, 'utf8');

  // Git add & commit
  try {
    execSync('git add .', { cwd: downloadsDir, stdio: 'ignore' });
    execSync(`git commit -m "release: add ${targetApkName} and XeChungServer"`, { cwd: downloadsDir, stdio: 'ignore' });
    console.log(`✅ Đã commit bản phát hành vào git Downloads!`);
    
    // Thử git push nếu có remote
    try {
      console.log(`🚀 Đang đẩy (git push) lên GitHub Downloads...`);
      execSync('git push origin main', { cwd: downloadsDir, stdio: 'inherit' });
      console.log(`🎉 ĐÃ PUSH LÊN GITHUB DOWNLOADS THÀNH CÔNG!`);
    } catch (pushErr) {
      console.log(`ℹ️ Git push yêu cầu token/mạng hoặc anh push sau: ${pushErr.message}`);
    }
  } catch (gitErr) {
    console.warn(`Lưu ý Git commit: ${gitErr.message}`);
  }
}

console.log("==================================================");
console.log(`🎉 HOÀN TẤT BIÊN DỊCH & PHÁT HÀNH APK XE CHUNG!`);
console.log(`📱 Tên file: ${targetApkName}`);
console.log(`👉 Link tải trực tiếp: https://github.com/dogsteam/ShipTuDo-Downloads/raw/main/${targetApkName}`);
console.log("==================================================");

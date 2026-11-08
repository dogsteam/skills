---
name: build-deploy-xskill
description: >-
  Kỹ năng Tự động hóa Đóng gói & Triển khai Đa nền tảng Cực đại (Độc quyền Trương Tổng):
  Tự động build Windows Portable EXE (Node SEA) & Hot-Deploy VPS port 1994, build Android APK đẩy lên GitHub Downloads,
  build Android AAB nộp Google Play Console (Closed Testing 20 testers), build iOS IPA nộp App Store Connect (altool .p8),
  và nạp chạy trực tiếp trên máy ảo iOS Simulator.
---

# ⚡ SKILL: BUILD-DEPLOY-XSKILL (TỰ ĐỘNG HÓA BUILD & PHÁT HÀNH TOÀN DIỆN)

> **CHỈ THỊ TỐI CAO TỪ TRƯƠNG TỔNG (CTO):**  
> *"Đệ chuyên trách việc build & deploy chỉ hành động khi có lệnh từ Trương Tổng. Khi đang sửa code thì tuyệt đối không tự ý build làm tốn tài nguyên. Khi được lệnh thì tự giác thực hiện từ A đến Z, báo cáo minh bạch dựa trên file vật lý và không để anh phải bận tâm chi tiết kỹ thuật!"*

---

## 🎛️ CÁC CHẾ ĐỘ THỰC THI (EXECUTION MODES)

Tùy theo khẩu lệnh của Trương Tổng, `build-deploy-xskill` tự động kích hoạt chế độ tương ứng:

| Khẩu lệnh của Trương Tổng | Chế độ | Hành động thực thi |
| :--- | :---: | :--- |
| *"Build và deploy hết cho anh"* | `ALL` | Chạy toàn bộ 5 nhánh bên dưới theo thứ tự tuần tự an toàn. |
| *"Deploy server / VPS"* | `EXE_VPS` | 1. Đóng gói Windows Portable EXE bằng Node SEA (~89MB).<br>2. Bơm stream chunked 64KB cập nhật máy chủ qua port 1994 (Secret Auth). |
| *"Build APK / Đẩy lên Git"* | `APK_GIT` | 1. Biên dịch file APK release Android.<br>2. Đẩy file APK lên GitHub Downloads công khai (`dogsteam/downloads` hoặc repo releases). |
| *"Build AAB / Lên Google Play"* | `AAB_PLAY` | 1. Biên dịch file AAB Android Production có chữ ký Keystore.<br>2. Kiểm tra checklist chống từ chối (Vị trí, Privacy Policy, Quyền truy cập).<br>3. Hướng dẫn/tải lên kênh Closed Testing (Alpha). |
| *"Build IPA / Lên App Store"* | `IPA_APPLE` | 1. Mở khóa Keychain và biên dịch file IPA bằng Xcode Release.<br>2. Dùng `xcrun altool` nạp trực tiếp qua API Key (.p8) lên TestFlight.<br>3. Tự động gắn build và Submit Review. |
| *"Đưa lên máy ảo Xcode"* | `SIM_IOS` | 1. Biên dịch target Debug-iphonesimulator.<br>2. Nhúng JS bundle (`npx expo export:embed`).<br>3. Cài đặt và khởi chạy trên booted iOS Simulator (`iPhone 18 Pro`). |

---

## 🛠️ CHI TIẾT CÁC LỆNH VẬN HÀNH CHUẨN XÁC

### 1. Nhánh EXE & VPS (`EXE_VPS`)
```bash
# Trong thư mục dự án:
npm run build:windows-exe
# Đẩy lên VPS:
node scripts/deploy-to-vps.mjs <IP_VPS> 1994 <SECRET_KEY>
```

### 2. Nhánh APK Android & Git Public (`APK_GIT`)
```bash
# Trong thư mục dự án:
node scripts/build-and-publish-apk.mjs
```
File APK sẽ được lưu tại thư mục gốc và đồng bộ lên kênh phát hành công khai trên GitHub.

### 3. Nhánh AAB Google Play Console (`AAB_PLAY`)
```bash
# Trong thư mục dự án:
npm run build:aab
```
* Đầu ra: `dist/android/<App>-production-vX.aab`.
* **Quy chuẩn ải Closed Testing 20 Testers (14 ngày):**
  * Tải lên kênh: **Kiểm thử khép kín (Closed Testing - Alpha)**.
  * Cung cấp danh sách 20-25 email tester của Trương Tổng.
  * Cung cấp Web Opt-in link cho tester: `https://play.google.com/apps/testing/<package_name>`.
  * Tài khoản reviewer: SĐT `0988888888`, OTP `123456`.

### 4. Nhánh IPA Apple App Store Connect (`IPA_APPLE`)
```bash
# Trong thư mục dự án:
npm run build:ios:local
# Tải lên TestFlight / ASC:
xcrun altool --upload-app -f "<duong_dan_ipa>" -t ios --apiKey "$APPLE_API_KEY_ID" --apiIssuer "$APPLE_API_ISSUER_ID"
# Tự động nộp duyệt:
node scripts/wait-and-submit-xechung.mjs
```

### 5. Nhánh Máy ảo iOS Xcode (`SIM_IOS`)
```bash
# 1. Build cho Simulator:
xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Debug -destination 'id=1CD31E34-C6E3-4DFA-810E-9E35B3801E90' build
# 2. Nhúng Bundle JS:
npx expo export:embed --entry-file node_modules/expo-router/entry.js --platform ios --dev false --bundle-output "<app_path>/main.jsbundle" --assets-dest "<app_path>"
# 3. Cài đặt và chạy:
xcrun simctl install booted "<app_path>"
xcrun simctl launch booted <bundle_id>
```

---

## 🔒 NGUYÊN TẮC KỶ LUẬT (ZERO ACCIDENTAL DEPLOYS)
1. **Chỉ làm khi có lệnh:** Không tự động build/deploy trong các phiên sửa code tính năng thông thường.
2. **Xác thực file vật lý:** Chỉ báo hoàn thành khi file `.exe`, `.apk`, `.aab`, `.ipa` đã xuất hiện trên đĩa với timestamp mới nhất và test pass 100%.
3. **Minh bạch tiến độ:** Gặp lỗi keystore, thiếu chứng chỉ, hoặc kẹt reviewer Google Play phải báo ngay nguyên nhân cụ thể và giải pháp cho Trương Tổng.

---
name: node-sea-pack-and-update
description: >-
  Đóng gói độc lập & Hot-Deploy cập nhật máy chủ qua cổng mạng (Độc quyền Trương Tổng):
  Tự động đóng gói Backend Node.js thành Windows Portable EXE độc lập bằng Node SEA (~89MB, không cần cài Node.js trên VPS),
  truyền stream chunked 64KB cập nhật máy chủ qua port (mặc định 1994) có xác thực Secret Key,
  build Android APK đẩy lên GitHub Downloads, và build iOS IPA cục bộ bằng Xcode.
---

# 📦 SKILL: NODE SEA PACKAGING & REMOTE HOT-DEPLOY VIA PORT (TRƯƠNG TỔNG SPEC)

> **Mục tiêu:** Cung cấp bộ công cụ đóng gói và cập nhật phần mềm chuẩn hóa 100% cho mọi dự án thuộc hệ sinh thái của Trương Tổng (`XeChung`, `AnNhanh`, `ShipTuDo`, `VnCheap.com`, `ITDeM`...), đảm bảo việc triển khai máy chủ và phát hành app diễn ra chỉ trong vài giây.

---

## 🛠️ CÁC TÍNH NĂNG CHÍNH CỦA BỘ SKILL

### 1. ĐÓNG GÓI WINDOWS PORTABLE EXE ĐỘC LẬP (NODE SEA)
* **Cơ chế:** Sử dụng tính năng Single Executable Application (Node SEA) tích hợp sẵn trong Node.js 20+ để nén toàn bộ mã nguồn Express/PostgreSQL/SQLite và runtime Node.js thành **duy nhất 1 file EXE** (`<ProjectName>Server.exe` nặng khoảng ~89MB).
* **Ưu điểm vượt trội:**
  - Không cần cài Node.js, không cần `npm install` trên VPS Windows.
  - Chống lộ mã nguồn (toàn bộ code đã được biên dịch thành binary blob).
  - Tự động đi kèm file cấu hình `.env` mẫu để chạy ngay.
* **Lệnh thực thi:**
  ```bash
  node scripts/build-windows-exe.mjs
  ```

---

### 2. HOT-DEPLOY CẬP NHẬT MÁY CHỦ QUA CỔNG MẠNG (REMOTE STREAM UPDATE)
* **Cơ chế:** Client nén file EXE mới -> Chia nhỏ thành các chunk 64KB -> Truyền qua HTTP streaming tới cổng bảo mật của VPS (mặc định port `1994`) -> Server xác thực bằng Secret Key HMAC SHA-256 -> Tự động sao lưu bản cũ -> Ghi đè file EXE mới -> Khởi động lại dịch vụ ngầm -> Health-check tự động sau 3 giây.
* **Ưu điểm:**
  - Không cần mở Remote Desktop (RDP) hay đăng nhập VPS thủ công.
  - Zero-downtime hoặc gián đoạn dịch vụ dưới 3 giây.
  - Tự động rollback nếu bản mới bị crash.
* **Lệnh thực thi:**
  ```bash
  node scripts/deploy-to-vps.mjs <VPS_IP> <PORT> <UPGRADE_SECRET>
  ```

---

### 3. BUILD ANDROID APK & TỰ ĐỘNG ĐẨY LÊN GITHUB RELEASES
* **Cơ chế:** Tự động tăng build number trong `app.config.js` -> Chạy Gradle build release APK -> Ký số keystore -> Đẩy trực tiếp lên kho Downloads trên GitHub (`dogsteam/<Project>-Downloads`) để khách hàng quét mã QR tải app ngay.
* **Lệnh thực thi:**
  ```bash
  node scripts/build-and-publish-apk.mjs
  ```

---

### 4. BUILD IOS IPA CỤC BỘ BẰNG XCODE (LOCAL ARCHIVE)
* **Cơ chế:** Sử dụng `xcodebuild archive` và `exportArchive` trực tiếp trên máy Mac mà không cần tốn phí build đám mây EAS. Tự động liên kết Provisioning Profile và nộp App Store API qua App Store Connect CLI.
* **Lệnh thực thi:**
  ```bash
  node scripts/build-production-ios-local.mjs
  ```

---

## 🚀 HƯỚNG DẪN ÁP DỤNG VÀO DỰ ÁN MỚI
Chỉ cần copy thư mục `scripts/` này vào thư mục gốc của bất kỳ dự án nào trong hệ sinh thái của Trương Tổng, hệ thống sẽ tự động nhận diện tên dự án và cấu hình cổng mạng tương ứng!

# 🍏 HƯỚNG DẪN CẤU HÌNH & XUẤT BẢN APP STORE CONNECT FAST TRACK

## 1. Ưu Thế Tài Khoản Apple Developer Của Trương Tổng
* Tài khoản Tổ chức / Cá nhân đã được kích hoạt đầy đủ quyền Program.
* Không phải chịu điều kiện 20 testers trong 14 ngày như Google Play.
* Cho phép phân phối ngay lập tức qua **TestFlight** (cả nội bộ và công khai qua link) và nộp duyệt App Store bản chính thức.

---

## 2. Các Bước Vận Hành Tự Động Qua CLI

### Bước 1: Chuẩn Bị Môi Trường
Đảm bảo các file cấu hình bảo mật được đặt tại `.private/apple/`:
* `AuthKey_<KEY_ID>.p8` (Khóa riêng tư API App Store Connect).
* `asc-api.mjs` (Script kết nối REST API của Apple).
* `test.keychain` (Keychain chứa Certificate `iPhone Distribution` và private key).

### Bước 2: Biên Dịch IPA
```bash
node scripts/build-production-ios-local.mjs
```
Script sẽ tự động:
1. Đọc số phiên bản và tăng build number.
2. Mở khóa build keychain.
3. Ký số bằng profile và xuất ra file `.ipa`.

### Bước 3: Tải Lên Bằng `altool`
```bash
xcrun altool --upload-app \
  -f "build/ipa/XeChung-iOS-v0.1.0-b7.ipa" \
  -t ios \
  --apiKey "62FWTPMX26" \
  --apiIssuer "c23e9055-9828-4822-93d8-3be6973a421e"
```

### Bước 4: Tự Động Gắn Build & Nộp Duyệt
```bash
node scripts/wait-and-submit-xechung.mjs
```
Script sẽ theo dõi quá trình xử lý của Apple, tự động gán bản build vào version và kích hoạt nút Submit for Review.

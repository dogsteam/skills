---
name: mobile-store-deploy
description: >-
  Đóng gói & Phát hành Mobile App (AAB & IPA) lên Google Play Console và Apple App Store Connect (Độc quyền Trương Tổng):
  Tối ưu quy trình AAB vượt ải Thử nghiệm khép kín (Closed Testing 20 testers / 14 ngày) chống bị Google từ chối,
  và quy trình IPA thần tốc nộp thẳng lên TestFlight & App Store Connect bằng Apple API (.p8) và altool.
---

# 🚀 SKILL: MOBILE STORE DEPLOY (GOOGLE PLAY & APPLE APP STORE)

> **CẨM NANG ĐỘC QUYỀN TỪ TRƯƠNG TỔNG (CTO):**  
> *"Phát hành ứng dụng di động là bước quyết định đưa sản phẩm đến tay khách hàng. Quy trình iOS có thể nộp thẳng thần tốc nhờ tài khoản Apple Developer chuẩn, nhưng Android Google Play Console hiện tại có rào cản cực lớn (Bắt buộc Closed Testing 20 tester trong 14 ngày & kiểm duyệt gắt gao về chính sách). Mọi kỹ sư và AI phải nắm vững cẩm nang này để app không bị từ chối và lên sàn nhanh nhất!"*

---

## 🎯 1. TỔNG QUAN CHIẾN LƯỢC PHÁT HÀNH 2 ĐẦU

| Tiêu Chí | 🍏 Apple App Store Connect (iOS IPA) | 🤖 Google Play Console (Android AAB) |
| :--- | :--- | :--- |
| **Định dạng file** | `.ipa` (nén từ `.xcarchive`) | `.aab` (Android App Bundle) |
| **Kênh phát hành** | **Fast Track:** Nộp thẳng TestFlight & App Store | **Bắt buộc 2 giai đoạn:** Phải qua Closed Testing trước |
| **Rào cản lớn nhất** | Review giao diện, chính sách thanh toán Apple IAP | **20 testers cài đặt liên tục trong 14 ngày** (Luật mới) |
| **Công cụ nạp tự động** | `xcrun altool --upload-app` hoặc ASC REST API | Google Play Console Web hoặc Google Play Developer API |
| **Thời gian lên sóng** | 24h - 48h sau khi bấm Submit Review | Tối thiểu 14 ngày thử nghiệm + 3-7 ngày xét duyệt |

---

## 🍏 PHẦN I: QUY TRÌNH IPA LÊN APP STORE CONNECT (FAST TRACK)

Tài khoản Apple Developer của Trương Tổng đã có đầy đủ chứng chỉ phân phối (`iPhone Distribution`), Provisioning Profile và App Store Connect API Key (`.p8`).

### Bước 1: Mở khóa Keychain và Biên dịch IPA cục bộ
Sử dụng script đóng gói cục bộ đã tích hợp sẵn trong dự án:
```bash
# Trong thư mục dự án (XeChung, ShipTuDo, AnNhanh):
node scripts/build-production-ios-local.mjs
```
* **Logic ngầm:**
  1. Tự động đọc phiên bản `version` và tăng `buildNumber` trong `Info.plist`.
  2. Mở khóa `test.keychain` với chứng chỉ số Apple Distribution.
  3. Chạy `xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Release archive`.
  4. Xuất file IPA độc lập vào thư mục gốc hoặc `build/ipa/<App>-iOS-vX.X.X-bY.ipa`.

### Bước 2: Tải IPA lên App Store Connect bằng `altool`
Không cần mở Xcode hay Transporter, nạp trực tiếp qua CLI với tốc độ nhanh nhất:
```bash
xcrun altool --upload-app \
  -f "<duong_dan_file_ipa>" \
  -t ios \
  --apiKey "$APPLE_API_KEY_ID" \
  --apiIssuer "$APPLE_API_ISSUER_ID"
```
* **Cấu hình API Key (lưu tại `.private/apple/`):**
  * `APPLE_API_KEY_ID`: Ví dụ `62FWTPMX26`
  * `APPLE_API_ISSUER_ID`: Ví dụ `c23e9055-9828-4822-93d8-3be6973a421e`
  * Private key file: `~/.private_keys/AuthKey_<KEY_ID>.p8` hoặc `.private/apple/AuthKey_<KEY_ID>.p8`

### Bước 3: Nộp Duyệt Tự Động (Auto-Submit Review)
Chạy script liên kết App Store Connect API để gắn build vừa xử lý vào phiên bản App Store và nộp duyệt:
```bash
node scripts/wait-and-submit-xechung.mjs
```
Script sẽ chờ trạng thái build chuyển từ `PROCESSING` sang `VALID`, tự động chọn bản build, kiểm tra screenshots và bấm nộp cho chuyên viên Apple kiểm duyệt.

---

## 🤖 PHẦN II: CHIẾN LƯỢC VƯỢT ẢI GOOGLE PLAY CONSOLE (AAB)

### ⚠️ NGUYÊN NHÂN AAB BỊ TỪ CHỐI & KẸT TRÊN GOOGLE PLAY
1. **Luật 20 Tester / 14 Ngày (Bắt buộc cho tài khoản tạo sau 13/11/2023):**
   * Nếu nộp thẳng kênh **Sản xuất (Production)**: Google sẽ khóa nút nộp và báo lỗi chưa đủ điều kiện thử nghiệm.
   * Nếu tạo bản phát hành trong **Thử nghiệm khép kín (Closed Testing)** nhưng chưa có đủ 20 tài khoản tester bấm chấp nhận tham gia qua web link, Google sẽ treo bản build hoặc từ chối đơn xin mở Production sau này.
2. **Khai báo quyền vị trí chạy ngầm (Location Policy):**
   * Các app giao vận, tài xế thường xin quyền `ACCESS_BACKGROUND_LOCATION` hoặc `FOREGROUND_SERVICE_LOCATION`.
   * Google **từ chối 100%** nếu không có video YouTube công khai quay rõ thao tác tài xế tắt màn hình mà app vẫn phát âm thanh hoặc nhận chuyến.
3. **Chính sách Quyền riêng tư (Privacy Policy):**
   * Thiếu link URL Privacy Policy công khai hoặc nội dung web không nhắc đến việc xử lý dữ liệu người dùng (SĐT, Vị trí).
4. **Đối tượng mục tiêu (Target Audience):**
   * Nếu chọn cả đối tượng dưới 18 tuổi hoặc trẻ em: Google bắt qua quy trình thẩm định cực gắt (Chính sách gia đình Families Policy).

---

### 🛡️ QUY TRÌNH 4 BƯỚC ĐƯA AAB LÊN GOOGLE PLAY CHUẨN XÁC

#### Bước 1: Đóng gói AAB Production với Keystore chính thức
```bash
# Trong thư mục dự án:
npm run build:aab
# hoặc:
node scripts/build-production-aab.mjs
```
* File AAB đầu ra được lưu tại: `dist/android/<App>-production-vX.aab`.
* Kiểm tra chắc chắn AAB đã được ký bằng `keystore.jks` chuẩn trong `credentials/android/`.

#### Bước 2: Tải AAB lên Kênh "Thử nghiệm khép kín" (Closed Testing - Alpha)
1. Đăng nhập Google Play Console: `https://play.google.com/console`.
2. Chọn ứng dụng mục tiêu (ví dụ: *XeChung* hoặc *AnNhanh*).
3. Vào menu bên trái: **Thử nghiệm (Testing)** -> **Thử nghiệm khép kín (Closed Testing)**.
4. Bấm **Tạo bản phát hành mới (Create new release)** -> Kéo thả file `.aab` vừa build lên.
5. Đặt tên bản phát hành (ví dụ: `1.0 (7)`) và ghi Chú thích phát hành (Release notes).
6. Bấm **Lưu (Save)** -> **Xem lại bản phát hành (Review release)** -> **Bắt đầu phát hành (Rollout)**.
> **Lưu ý:** Sau khi bấm Rollout, Google sẽ chạy quy trình quét tự động trong tối đa 9 phút ("Còn lại tối đa 9 phút"). Đây là bước quét virus/mã độc tự động, kiên nhẫn chờ xong.

#### Bước 3: Vượt Ải 20 Testers trong 14 Ngày (QUYẾT ĐỊNH THÀNH BẠI)
1. Trong mục **Thử nghiệm khép kín**:
   * Bấm vào tab **Người thử nghiệm (Testers)**.
   * Bấm **Tạo danh sách email (Create email list)** -> Nhập danh sách ít nhất 25 email Google thật (dự phòng 5 người).
2. Kéo xuống dưới mục **Cách người thử nghiệm tham gia**:
   * Sao chép link **Tham gia trên web (Join on the web)**:  
     `https://play.google.com/apps/testing/<package_name>`
3. Gửi link này cho tất cả 20 người thử nghiệm:
   * Yêu cầu từng người bấm **"Trở thành người thử nghiệm (Become a tester)"**.
   * Bấm vào link tải app trên Google Play về điện thoại thật.
   * **Quy tắc vàng:** Giữ app trên máy và mở tương tác tối thiểu 14 ngày liên tục.
4. Sau đủ 14 ngày: Nút **"Yêu cầu quyền truy cập bản phát hành chính thức (Apply for production)"** sẽ sáng lên.
   * Trả lời bảng câu hỏi khảo sát của Google (Hỏi về: Bạn đã thu thập phản hồi của tester thế nào? Có lỗi crash nào không? Đã sửa ra sao?).

#### Bước 4: Hoàn thành 100% mục "Nội dung ứng dụng" (App Content Checklist)
Trước khi được duyệt, phải tick xanh toàn bộ các mục trong **Chính sách và chương trình** -> **Nội dung ứng dụng**:
* [x] **Chính sách quyền riêng tư:** Điền link website thật có giao diện (ví dụ: `https://xechung.vn/privacy.html`).
* [x] **Quyền truy cập ứng dụng:** Cung cấp tài khoản test mẫu (SĐT: `0988888888`, OTP: `123456`) để kỹ sư Google đăng nhập được.
* [x] **Quảng cáo:** Chọn *"Không, ứng dụng của tôi không chứa quảng cáo"*.
* [x] **Đối tượng mục tiêu:** Chọn **18 tuổi trở lên** (Bỏ chọn dưới 18 để né chính sách trẻ em).
* [x] **An toàn dữ liệu (Data Safety):** Khai báo đúng các trường: Vị trí (Location), Thông tin cá nhân (SĐT, Tên) phục vụ quản lý đơn cuốc.
* [x] **Dịch vụ chạy nền (Foreground Services):** Chọn loại dịch vụ `Remote Messaging` hoặc `Location` kèm lời giải thích ngắn gọn: *"Theo dõi hành trình đón trả khách liên tỉnh"*.

---

## 📋 BẢNG TỔNG KẾT HÀNH ĐỘNG NHANH CHO AI & DEV

| Nhiệm vụ | Lệnh thực thi | Ghi chú an toàn |
| :--- | :--- | :--- |
| **Build & Upload iOS IPA** | `npm run build:ios:local && node scripts/auto-upload-and-submit.mjs` | Upload thẳng lên ASC, nộp duyệt luôn |
| **Build Android AAB** | `npm run build:aab` | File xuất ra tại `dist/android/*.aab` |
| **Kiểm tra trạng thái duyệt** | Kiểm tra email developer hoặc vào trực tiếp App Store Connect / Play Console | Cấm báo hoàn thành khi đang quét 9 phút hoặc đang chờ tester |

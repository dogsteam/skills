# Self-Hosted Signed JS OTA Protocol (Expo Updates v1)

> **Mục tiêu:** Cập nhật tới **95% mã nguồn React/TypeScript** (màn hình mới, state mới, logic UI mới, assets ảnh/font/JS) trực tiếp từ **VPS riêng của dự án** mà không cần nộp lại App Store / Google Play và không phụ thuộc Expo Cloud / Microsoft AppCenter.

---

## 1. Kiến trúc Unified `runtimeVersion`

iOS và Android trong nhiều dự án thường lệch marketing version (ví dụ iOS `2.0.9`, Android `0.1.62`). Nếu dùng `runtimeVersion: { policy: 'appVersion' }`, mỗi lần OTA phải tách 2 nhánh version rất dễ nhầm.

- **Quy chuẩn:** Tách `runtimeVersion` thành chuỗi ABI cố định theo vòng đời vỏ Native, ví dụ `"native-1"` trong `app.config.js` / `app.json` (và đồng bộ với `EXUpdatesRuntimeVersion` trên iOS `Expo.plist`, `expo_runtime_version` trên Android `strings.xml`).
- Chỉ tăng `"native-1"` -> `"native-2"` khi thật sự có thay đổi Native ABI (thêm SDK native mới hoặc nâng React Native / Expo SDK) và nộp Store bản shell mới.

---

## 2. Cấu hình `expo-updates` trên Native Shell (`app.config.js`)

```js
updates: {
  enabled: true,
  url: 'https://<YOUR_DOMAIN>/api/v1/ota/manifest',
  checkAutomatically: 'ON_LOAD',
  fallbackToCacheTimeout: 0, // Mở app ngay lập tức bằng cache cục bộ, tải OTA ở nền
  codeSigningCertificate: './credentials/ota-cert.pem',
  codeSigningMetadata: {
    keyid: 'main',
    alg: 'rsa-v1_5-sha256',
  },
},
runtimeVersion: 'native-1',
```

- **Quy tắc bảo mật & định dạng Key RSA-2048 X.509:**
  - `expo-updates` trên iOS/Android **BẮT BUỘC** nhúng **X.509 Certificate (`-----BEGIN CERTIFICATE-----`)** có extension `keyUsage = critical, digitalSignature` và `extendedKeyUsage = critical, codeSigning` (KHÔNG được dùng `PUBLIC KEY` PEM thô vì parser native sẽ từ chối). Tạo chuẩn 1 lệnh bằng:
    ```bash
    node <skill_dir>/scripts/publish-ota.mjs --keygen --cert-out ./credentials/ota-cert.pem --key-out ~/.secrets/ota-private.pem
    ```
    *(Hoặc dùng `npx expo-updates codesigning:generate`).*
  - `ota-cert.pem` (Public Certificate) đóng gói vào trong `.ipa`/`.aab`.
  - `ota-private.pem` (Private Key RSA-2048) **TUYỆT ĐỐI KHÔNG** commit lên Git công khai và **KHÔNG** lưu thường trực trên VPS production. Chỉ ký trên máy build / CI lúc chạy lệnh phát hành (`scripts/publish-ota.mjs --publish`).
  - Lợi ích: Ngay cả khi server hoặc CDN bị chiếm quyền hoặc DNS bị tấn công, app client sẽ **từ chối nạp bundle không khớp chữ ký**.

---

## 3. Hợp đồng API Server Tự Host (Expo Updates Protocol v1)

### `GET /api/v1/ota/manifest`
- **Request Headers từ `expo-updates` client:**
  - `expo-platform`: `ios` | `android`
  - `expo-runtime-version`: ví dụ `native-1`
  - `expo-current-update-id`: UUID bản hiện tại đang chạy trên máy khách
  - `expo-channel-name` *(tùy chọn)*: `production` | `staging`
  - `accept`: thường gồm `multipart/mixed, application/expo+json, application/json`
- **Response Status & Protocol:**
  - Nếu client đã ở bản mới nhất hoặc không có bản khớp `runtimeVersion` + `platform`: trả về `204 No Content`.
  - Nếu trả **Manifest** bản mới: hỗ trợ cả `application/json` và `multipart/mixed` (với part `name="manifest"`). Body chứa `{ id, createdAt, runtimeVersion, launchAsset, assets, metadata, extra }`.
  - Nếu trả **Directive `rollBackToEmbedded`** (khi bản mới nhất bị Admin đánh dấu Rollback mà chưa có bản trước): Theo chuẩn Expo Updates v1, bắt buộc trả qua **`multipart/mixed`** với part `name="directive"`, kèm header chữ ký `expo-signature` (được ký sẵn lúc build bởi `publish-ota.mjs` nên VPS **vẫn không cần giữ Private Key**!).
- **Response Headers bắt buộc:**
  - `expo-protocol-version: 1`
  - `expo-sfv-version: 0`
  - `content-type: application/json` (hoặc `multipart/mixed; boundary=...` trên response root / `application/json; charset=utf-8` trên từng part)
  - `cache-control: private, max-age=0, no-store`
  - `expo-signature: sig=":<BASE64_RSA_SHA256_SIGNATURE>:", keyid="main", alg="rsa-v1_5-sha256"` *(Lưu ý dấu `:` bao quanh base64 theo chuẩn Expo SFV Byte Sequence; chữ ký ký từ **raw serialized JSON string** bằng SHA-256 RSA).*

### `GET /api/v1/ota/assets/:hash`
- Phục vụ file `.hbc` (Hermes bytecode) và static assets tương ứng theo SHA-256 hash.
- Nên bật nén gzip/brotli; set header `Cache-Control: public, max-age=31536000, immutable`.

---

## 4. Vòng đời An toàn & Tự Hồi Phục (Canary + Rollback)

1. **Startup Crash Protection (`expo-updates` tích hợp sẵn):**
   Nếu JS bundle tải về bị crash ngay khi khởi động trước khi render xong màn đầu, native shell tự động quay về bản embedded/bản ổn định trước đó trong tích tắc.
2. **In-App Check mượt (Không làm gián đoạn Shipper/User):**
   - Với bản vá UI/feature bình thường: Tải ngầm ở background và tự kích hoạt ở lần mở app kế tiếp (**Silent Next Launch**).
   - Chỉ hiện banner *"Có cập nhật mới — Bấm để tải lại nhanh (2s)"* hoặc tự `Updates.reloadAsync()` khi app vừa mở ở màn hình chờ (KHÔNG reload giữa lúc tài xế đang vuốt giao hàng hoặc đang gọi đơn).
3. **Canary Rollout & Instant Admin Rollback:**
   Bảng `ota_releases` trên CSDL server lưu lịch sử bản phát hành kèm trường `rolloutPercent` (ví dụ thử trước `10%` thiết bị qua hash `deviceId`), `status` (`active` | `rolled_back`). Nếu phát hiện tỷ lệ lỗi tăng trên Sentry/log, Admin bấm **Rollback 1-click** để trả về bản cũ tức thì cho mọi thiết bị chưa tải hoặc đưa directive quay lại bundle cũ.

---

## 5. Ranh giới Pháp lý Apple App Store (2.5.2 / 3.3.2) & Google Play

- **Hợp lệ 100%:** Nạp JS/Hermes bundle do chính nhà phát triển ký, dùng lại Native Runtime có sẵn, sửa lỗi, nâng cấp UX/luồng nghiệp vụ trong đúng phạm vi mục đích app đã được duyệt.
- **Vi phạm (CẤM):** Tải mã nhị phân native (`.dylib`, `.framework`, `.so`, `.dex`), dùng OTA để thay đổi hoàn toàn mục đích app (ví dụ app vận chuyển biến thành app cá cược/chứng khoán), hoặc mở khóa bán hàng số lách Apple IAP.

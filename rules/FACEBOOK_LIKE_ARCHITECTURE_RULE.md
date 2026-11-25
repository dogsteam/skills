# ⚡ QUY CHUẨN KIẾN TRÚC FACEBOOK-LIKE: ZERO-STORE-UPDATE & ZERO-SECRET POLICY

> **Mục tiêu:** Mọi thay đổi tính năng, UI, quy trình và sửa lỗi về sau **chỉ cập nhật Server (`Backend` / `SDUI` / `Signed JS OTA`)**, tuyệt đối không làm phát sinh bản nộp lại App Store / Google Play và không để lộ bí mật khi dịch ngược APK/IPA.

## 1. CHỐT CHẶN NATIVE SHELL FREEZE (HỎI TRƯỚC KHI CHẠM BINARY)

Sau khi bản **Golden Native Shell** đã phát hành trên Store, áp dụng kỷ luật **khóa cứng vỏ Native**:

1. **Thứ tự giải quyết mọi tính năng mới (từ ưu tiên cao nhất đến thấp nhất):**
   - **Làn 1 (0 giây — Không build client):** Xử lý tại Backend API, Webhook đối tác, Pricing/Settlement Engine, Proxy, hoặc trả Flag/Config mới.
   - **Làn 2 (< 1 giây — Không build JS bundle):** Cập nhật cấu trúc Form, Banner, Thẻ, Nút bấm, Luồng điều hướng thông qua **SDUI JSON Schema** từ Admin/Backend.
   - **Làn 3 (Vài giây — Không qua Store):** Thay đổi/thêm mới component React, TypeScript state, màn hình mới và phát hành qua **Self-Hosted Signed JS OTA (`expo-updates`)**.
2. **VÙNG CẤM TỰ Ý SỬA (Bắt buộc DỪNG & BÁO ĐỎ CTO nếu đụng tới):**
   - Cài bất kỳ package nào có liên kết native `ios/` hoặc `android/` (không phải pure JavaScript).
   - Chỉnh sửa `ios/**`, `android/**`, `Info.plist`, `AndroidManifest.xml`, Podfile, Gradle, hoặc `plugins` / `runtimeVersion` trong `app.config.*`.
   - Khi gặp yêu cầu đòi hỏi quyền OS hoặc SDK native mới chưa có sẵn trong vỏ Native: **Dừng lại ngay**, giải thích rõ *tại sao Backend/JS OTA/WebView không làm được*, và chỉ sửa sau khi CTO xác nhận *"Chấp nhận build & nộp lại Store"*.
3. **Cấm hứa suông khi được hỏi "Up server là xong đúng không?":**
   - Phải kiểm tra thực tế mã nguồn: nếu tính năng phụ thuộc thay đổi mã máy khách chưa từng có trong binary trên Store -> nói thẳng là cần build/OTA tương ứng, tuyệt đối không trả lời mơ hồ.

## 2. ZERO-SECRET & CHỐNG DỊCH NGƯỢC TUYỆT ĐỐI

1. **Không logic nhạy cảm trên Client (`src/`):** Cấm giữ công thức tính tiền/cước, % chiết khấu, thuật toán chấm điểm/matching, hay hardcode phí ở UI. Client chỉ gửi input và hiển thị kết quả tính toán từ Server.
2. **Không lộ Key thứ 3 ở Client:** Cấm gửi raw `mapTilesKey`, key AI (OpenAI/Google), key hãng vận chuyển, hay secret webhook xuống App/WebView — mọi giao tiếp với bên thứ 3 phải đi qua **Backend Proxy**.
3. **Masking tại Server:** Dữ liệu nhạy cảm (SĐT khách trước khi nhận đơn, doanh thu nội bộ) phải được Server che/ẩn trước khi trả JSON.
4. **Cấm thực thi mã động thô:** Tuyệt đối cấm `eval()`, `new Function()`, hoặc tải script JS không qua chữ ký số RSA của `expo-updates`.

## 3. CHUẨN OTA, OFFLINE CACHE & AN TOÀN UI

1. **OTA Signed & Crash Rollback:** Gói JS OTA tự host phải có chữ ký RSA (`expo-signature`), đồng bộ `runtimeVersion`, và giữ Auto-Rollback khi lỗi boot.
2. **SDUI An toàn:** Mọi màn SDUI phải có Cache local (mở app < 0.1s khi mất mạng) và bọc `ErrorBoundary` fallback về giao diện tĩnh an toàn.
3. **Single Source of Truth & Theme Tokens:** Thành phần dùng chung (Header, Modal, Card) chỉ viết ở 1 component gốc; dùng Design Tokens (`theme.*`), cấm fix cứng màu hex lẻ tẻ.
4. **4 Lớp Thoát Hiểm & Safe Area Modal:** Mọi Modal phải có đủ: (1) Nút `X` độ tương phản cao (`zIndex: 9999`), (2) Vuốt trượt đóng PanResponder, (3) Chạm backdrop đóng, (4) Phím Back Android + Safe Area Top Inset cho tai thỏ/Dynamic Island (`Math.max(insets.top, Platform.OS === 'ios' ? 52 : 28)`).
5. **Cử chỉ Quan trọng:** Thao tác xác nhận quan trọng (nhận đơn, giao hàng...) dùng `SlideToConfirm` 120 FPS UI thread, không bật popup hỏi lại gây vướng tay.

## 4. CỔNG KIỂM CHỨNG BẮT BUỘC TRƯỚC KHI BÁO XONG

Trước khi kết luận xong một thay đổi thuộc Backend / OTA / SDUI:
- Chạy `npm run typecheck` (và `typecheck` của backend nếu có).
- Chạy kiểm chứng không vi phạm Native Shell & Zero-Secret (`node .agents/scripts/audit-facebook-like.mjs --check-diff` hoặc script audit của `facebook-like-xskill`).
- Xác nhận rõ trong báo cáo: thay đổi vừa rồi triển khai bằng **(Backend Only / SDUI / JS OTA)** và **KHÔNG cần nộp lại App Store / Google Play**.

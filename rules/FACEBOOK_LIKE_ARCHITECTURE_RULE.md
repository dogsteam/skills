# ⚡ QUY CHUẨN KIẾN TRÚC FACEBOOK-LIKE: SERVER-DRIVEN UI & DYNAMIC OTA CONTAINER

> **CHỈ THỊ CỐT LÕI TỪ TRƯƠNG TỔNG (CTO):**  
> *"Ứng dụng Mobile phải vận hành giống như Facebook: Native Shell nộp Store 1 lần duy nhất để giữ chỗ và cấp quyền thiết bị. Mọi thay đổi về giao diện, thuật toán matching, phân luồng cuốc và khuyến mãi đều phải được Server cập nhật ngầm tức thì (Instant Dynamic OTA) trong vài giây mà không cần người dùng cập nhật qua App Store hay Google Play, tuyệt đối không bị lộ API và bí mật nghiệp vụ khi bị decompile APK/IPA!"*

---

## 🏛️ ĐIỀU 1: KIẾN TRÚC 2 TẦNG BẮT BUỘC (TWO-TIER CONTAINER ARCHITECTURE)

Mọi ứng dụng Mobile chuyển đổi sang chuẩn Facebook-like bắt buộc phải chia làm 2 tầng tách biệt hoàn toàn:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TẦNG 1: NATIVE SHELL (CONTAINER DUY NHẤT NỘP STORE 1 LẦN)             │
│  - Reanimated 120 FPS Gesture (SlideToConfirm vuốt nhận cuốc)          │
│  - Native Hardware Capabilities: GPS Location, Telemetry, Haptics      │
│  - OS Speech TTS (Giọng nói cảnh báo lái xe tiếng Việt)                │
│  - Native Camera & Photo Picker                                        │
│  - SDUIRenderer: Trình thông dịch & kết xuất giao diện động            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Tải Dynamic Bundle / Schema JSON
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  TẦNG 2: SERVER-DRIVEN UI & DYNAMIC OTA RUNTIME (CẬP NHẬT NGẦM TỨC THÌ)│
│  - Màn hình đặt xe, form chọn điểm đến, bảng giá, loại cuốc           │
│  - Sàn cuốc tài xế, quy tắc ẩn SĐT 098****321, thẻ thống kê doanh thu │
│  - Ví tài xế, ngân hàng VietQR Napas, banner khuyến mãi, voucher      │
│  - Action Bindings: Ánh xạ sự kiện bấm nút sang API backend            │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Tầng 1: Native Shell Container (Bất Biến & Nộp Store Duy Nhất 1 Lần)
- Là khung Native biên dịch tĩnh (Xcode Archive -> IPA, Gradle -> AAB/APK).
- Chỉ chứa các module Native phụ thuộc sâu vào hệ điều hành mà JavaScript không thể tự tạo:
  * `react-native-reanimated` & `react-native-gesture-handler`: Đảm bảo thanh trượt **SlideToConfirm** vuốt ngang nhận cuốc chạy mượt mà 60/120 FPS trên UI thread, không bị giật lag khi lái xe.
  * `expo-speech` / Audio TTS: Giọng nói AI cảnh báo cuốc mới cho tài xế.
  * Haptic Feedback: Rung phản hồi khi vuốt thành công.
  * Map & Telemetry Native: Bản đồ và định vị GPS 2 đầu Thái Nguyên ⇋ Hà Nội.
  * `SDUIRenderer`: Trình thông dịch Schema JSON từ Server thành các Native Component tương ứng.

### 2. Tầng 2: Server-Driven UI & Dynamic Presentation Runtime (Biến Thiên Ngầm)
- Toàn bộ giao diện người dùng (Screens, Modals, Forms, Banners, Cards) được Server mô tả dưới dạng Schema JSON hoặc Dynamic Bundle.
- Khi ứng dụng mở lên: Client âm thầm gọi `/api/v1/ota/check` để kiểm tra phiên bản mới nhất. Nếu có bản cập nhật, client tải bundle ngầm trong vài giây và áp dụng ngay lập tức mà người dùng không hề hay biết và không cần Store duyệt!

---

## 🔒 ĐIỀU 2: BẢO MẬT TUYỆT ĐỐI (ZERO REVERSE-ENGINEERING LEAKS)

1. **Giấu 100% Thuật toán nhạy cảm trên Server:**
   - Thuật toán định giá cuốc (15k/ghế, 40k/bao xe, 10k/gửi hàng).
   - Thuật toán ghép khách, chia tuyến hành lang Thái Nguyên ⇋ Hà Nội.
   - Cơ chế bảo mật ẩn số điện thoại khách hàng (`098****321`) trên sàn cuốc tài xế.
2. **Client chỉ đóng vai trò Presentation Runtime:**
   - Phía Client chỉ nhận dữ liệu đã được xử lý an toàn từ Server.
   - Hacker giải nén file APK (`apktool`) hoặc IPA (`class-dump`) sẽ **CHỈ THẤY NATIVE SHELL RỖNG**, tuyệt đối không tìm thấy bất kỳ secret key, token backend hay logic nghiệp vụ nào!

---

## ⚡ ĐIỀU 3: BẢO TOÀN 100% TRẢI NGHIỆM NATIVE (60/120 FPS EXPERIENCE)

1. **Tuyệt đối không dùng WebView thô thiển:**
   - Server-Driven UI ở đây **KHÔNG PHẢI LÀ NHÚNG WEBVIEW TRÌNH DUYỆT**.
   - Client sử dụng các Native Component thật (`View`, `Text`, `Pressable`, `Animated.View`) để hiển thị theo chỉ dẫn của JSON Schema từ Server.
2. **Cử chỉ vuốt ngang SlideToConfirm phải Native:**
   - Nút vuốt ngang nhận cuốc của tài xế bắt buộc chạy qua Reanimated Worklet trên UI Thread native để chống trượt tay khi đang lái xe trên cao tốc.

---

## 🛠️ ĐIỀU 4: QUY TRÌNH CHUYỂN ĐỔI AN TOÀN 5 GIAI ĐOẠN (MIGRATION PHASES)

Mọi tác vụ chuyển đổi app sang Facebook-like phải tuân thủ nghiêm ngặt 5 giai đoạn sau:

* **Giai đoạn 1 (Safety Snapshot):** Tạo commit Git an toàn sao lưu trạng thái hiện tại (`git commit -m "feat(backup): snapshot before Facebook-like migration"`).
* **Giai đoạn 2 (Native Shell Decoupling):** Đóng gói các Native Module (Reanimated, Speech, Haptics) thành các khối độc lập không bị phụ thuộc vào giao diện tĩnh.
* **Giai đoạn 3 (SDUI Engine Integration):** Bổ sung trình thông dịch `src/components/sdui/SDUIRenderer.tsx` và cơ chế Fallback Offline (nếu mất mạng thì chạy giao diện mặc định có sẵn).
* **Giai đoạn 4 (Server Schema & OTA Endpoints):** Bổ sung endpoint backend `/api/v1/ota/schema` và `/api/v1/ota/check` trên server Express.
* **Giai đoạn 5 (Physical Verification):** Chạy `npm run typecheck`, kiểm thử trên iOS Simulator (`iPhone 18 Pro`), kiểm tra độ mượt 120 FPS của thanh vuốt nhận cuốc và xác thực file vật lý.

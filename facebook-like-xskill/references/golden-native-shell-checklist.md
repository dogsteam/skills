# Golden Native Shell Checklist (Nộp Store 1 Lần Vững Chắc 1-2 Năm)

> Mọi quyền hệ điều hành và module Native C++/Swift/Kotlin đều bị Apple/Google khóa trong binary `.ipa`/`.aab`. Nếu sau này thiếu mới thêm thì **bắt buộc nộp Store lại**. Do đó, bản **Golden Native Shell** phải được chuẩn bị kỹ một lần cho cả lộ trình trung-dài hạn.

---

## 1. Dự phòng Quyền Hệ Điều Hành Hợp Lý (iOS `Info.plist` & Android `AndroidManifest.xml`)

> ⚠️ **Cảnh báo Apple Review:** Chỉ khai báo quyền nếu App có dùng thật hoặc có flow giao diện giải thích rõ ràng khi review; **TUYỆT ĐỐI KHÔNG** để mô tả placeholder tiếng Anh như `"Allow $(PRODUCT_NAME) to access your location"` — mọi chuỗi `*UsageDescription` phải viết bằng tiếng Việt chuẩn mực, nêu rõ lý do tính năng cụ thể.

Kiểm tra danh sách quyền & module nền cần có sẵn trong Native Shell:
- [ ] **OTA Runtime:** `expo-updates` đã cài đặt; `EXUpdatesEnabled = true` (`ios/<AppName>/Supporting/Expo.plist`), `expo.modules.updates.ENABLED = "true"` (`android/app/src/main/AndroidManifest.xml`), `runtimeVersion` cố định (VD `"native-1"` — đồng bộ giữa `app.config.*`, `Expo.plist` `EXUpdatesRuntimeVersion`, và `AndroidManifest.xml` / `strings.xml`), nhúng sẵn X.509 Public Code Signing Certificate (`-----BEGIN CERTIFICATE-----`).
- [ ] **Cử chỉ & UI 120 FPS:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-webview`.
- [ ] **Định vị & Bản đồ:** `expo-location` (`NSLocationWhenInUseUsageDescription` rõ ràng). Nếu app không cần theo dõi nền khi tắt màn hình, **tránh xin** `Background Location` (vì Google Play bắt nộp video thuyết minh cực gắt).
- [ ] **Giọng nói & Âm thanh:** `expo-speech`, `expo-speech-recognition`, `expo-audio`, `UIBackgroundModes: ["remote-notification", "audio"]`.
- [ ] **Thông báo & Rung:** `expo-notifications` (kênh notification + custom `.wav` sounds đã nhúng trong bundle gốc + `sound-pack-manager.ts` cập nhật OTA file âm thanh), `expo-haptics`.
- [ ] **Tiện ích Bảo mật & Chia sẻ:** `expo-secure-store`, `expo-clipboard`, `expo-linking`, `expo-file-system`.
- [ ] **Chụp ảnh / Quét QR / Đính kèm minh chứng:** `expo-document-picker` / `expo-image-picker` / `expo-camera` *(nếu có kế hoạch quét QR ngân hàng/đơn hàng hoặc chụp ảnh giao nhận trong 12 tháng tới -> cân nhắc tích hợp sẵn ngay từ bản Golden Shell)*.
- [ ] **In hóa đơn nhiệt / Sinh trắc học (Tùy chọn theo ngành):** `Bluetooth` hoặc `LocalAuthentication` (FaceID/TouchID) — chỉ đưa vào nếu app đã có màn hình bật/tắt tính năng để vượt qua bài test của reviewer.

---

## 2. Kiểm tra Safe Area & Tương thích Xcode/Android Mới nhất

- **iOS Window Scene Lifecycle:** Khi build bằng Xcode/iOS SDK mới, đảm bảo có `SceneDelegate.swift` + `UIApplicationSceneManifest` trong `Info.plist` (tránh crash `EXC_BREAKPOINT` ngay khi launch trên iPad/iOS mới).
- **Modal Safe Area Inset Rule:** Trên iOS, `<Modal>` tạo một `UIWindow` tách biệt khiến `SafeAreaView` đôi khi trả về `0`. Mọi Header Modal chuẩn (`UnifiedModalHeader.tsx`) bắt buộc lấy `Math.max(insets.top || 0, initialWindowMetrics?.insets.top || 0, Platform.OS === 'ios' ? 52 : 28)`.
- **Android 14+ Foreground Service Clean:** Nếu app không chạy Audio Controls nền hay media player chuyên biệt, strip các permission foreground thừa gây reject trên Play Console.

---

## 3. Chứng từ Store & Reviewer Readiness

- [ ] URL `Privacy Policy` công khai phản ánh đúng dữ liệu thu thập (Vị trí, SĐT, Micro/Voice nếu có).
- [ ] Tài khoản test reviewer hoạt động được ngay (SĐT + OTP/Password cố định trong note review).
- [ ] Đã kiểm thử bản Release/Preview trên iOS Simulator + thiết bị Android thật trước khi nộp Golden Shell.

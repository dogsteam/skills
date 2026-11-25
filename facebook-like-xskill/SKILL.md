---
name: facebook-like-xskill
description: >-
  Quy chuẩn & Kỹ năng Chuyển đổi Kiến trúc Facebook-like (Độc quyền Trương Tổng):
  Tách biệt Native Shell (nộp Store 1 lần duy nhất) và Server-Driven UI / Dynamic OTA Container (cập nhật ngầm tức thì vài giây),
  bảo mật 100% thuật toán giá và secret API trên server (chống dịch ngược APK/IPA), bảo toàn cử chỉ vuốt 120 FPS SlideToConfirm,
  TTS âm thanh giọng nói lái xe và GPS native. Kèm bộ quy tắc Phân định Ranh giới Kỹ thuật và 4 Lớp Thoát Hiểm An Toàn Tuyệt Đối cho Modal.
---

# 🚀 SKILL: FACEBOOK-LIKE-XSKILL (SERVER-DRIVEN UI & DYNAMIC OTA CONTAINER)

> **CHỈ THỊ KỸ THUẬT BẤT BIẾN TỪ CTO TRƯƠNG TỔNG:**  
> *"Ứng dụng Mobile phải tách biệt làm 2: Khung Native nộp Store 1 lần duy nhất để cấp quyền và giữ chỗ. Còn lại 100% giao diện, thuật toán match, khuyến mãi, bố cục màn hình do Server đẩy về tức thì. Người dùng mở app là tự động nhận bản mới trong vài giây, không chờ Apple hay Google duyệt, không sợ lộ bí mật khi bị dịch ngược mã! Tuyệt đối không làm chắp vá, phải có 4 lớp thoát hiểm cho mọi modal và phân định ranh giới kỹ thuật trung thực, cấm báo cáo láo!"*

---

## 🏗️ 1. TỔNG QUAN KIẾN TRÚC FACEBOOK-LIKE

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SERVER (BACKEND NODE.JS / VPS)                    │
│  - Endpoint /api/v1/ota/check (Kiểm tra version, hash & bundle mới)     │
│  - Endpoint /api/v1/ota/bundle (Đẩy Dynamic Schema JSON nén brotli/gzip)│
│  - Secret Matching & Pricing Engine (15k/ghế, 40k/bao xe, 10k/hàng)    │
│  - 098****321 Privacy Masking Engine (Ẩn SĐT khách trên sàn tiện chuyến)│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Tải Dynamic Schema (vài chục KB trong 0.2s)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 CLIENT RUNTIME (REACT NATIVE / EXPO)                   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ A. NATIVE SHELL CONTAINER (Nộp App Store & Play Store 1 lần)     │  │
│  │ - react-native-reanimated: SlideToConfirm vuốt nhận cuốc 120 FPS │  │
│  │ - expo-speech: OS TTS giọng nói cảnh báo tài xế tiếng Việt       │  │
│  │ - expo-haptics: Rung phản hồi native khi khớp cuốc               │  │
│  │ - expo-location: GPS hành lang 2 đầu (VD: Thái Nguyên ⇋ Hà Nội)  │  │
│  │ - PanResponder: Cử chỉ kéo vuốt trượt đóng modal có lò xo vật lý │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ B. SERVER-DRIVEN UI RENDERER (src/components/sdui/SDUIRenderer)  │  │
│  │ - Dynamic Screen Interpreter: Đọc JSON Schema thành Native Views │  │
│  │ - Action Dispatcher: Ánh xạ sự kiện click / swipe sang API       │  │
│  │ - Theme Tokens Resolver: Cấm mã màu Hex cứng, tự đổi Light/Dark  │  │
│  │ - Offline Local Cache: Mất mạng vẫn mở được app trong 0.1 giây   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ 2. BỘ QUY TẮC BẤT BIẾN TỪ TRƯƠNG TỔNG (CORE LAWS)

### Điều 1: Quy Tắc Phân Định Ranh Giới Kỹ Thuật (Technical Boundary Audit)
Khi CTO hỏi: *"Fix xong up lên server cho anh là được đúng không?"*: **BẮT BUỘC** phải phân định ranh giới kỹ thuật trung thực, nghiêm cấm trả lời xuôi tai "Đúng rồi" nếu tính năng đó chưa có trong mã máy khách:
* **Server SDUI OTA làm được ngay (Sau 2 giây):**
  * Thay đổi bố cục Schema JSON, ẩn/hiện thành phần (Banner, thẻ khuyến mãi, khung xe, số dư).
  * Điều chỉnh thứ tự danh mục, bảng giá cước, hotline hỗ trợ, text hiển thị, màu sắc Design Tokens.
  * Đổi vị trí, style nút bấm, cấu hình endpoint API gọi đến.
* **Native Shell Runtime bắt buộc phải build Store (APK/AAB/IPA):**
  * Cử chỉ Native vật lý mới (`PanResponder` vuốt trượt đóng, Reanimated worklet mới).
  * Quyền thiết bị hệ điều hành (`PermissionsAndroid`, Info.plist: Camera, Microphone, Background GPS, Push Notifications).
  * Thư viện Native mới (`expo-speech`, `react-native-svg`, module Bluetooth...).
  * Sự kiện phím cứng hệ thống (`BackHandler`, Android `onRequestClose`).

### Điều 2: Quy Tắc Tự Chủ Hệ Thống & Cấm Làm Chắp Vá Cục Bộ (Systemic Consistency)
* Khi CTO yêu cầu chỉnh sửa chung (như chuẩn hóa nút X, modal, thanh kéo, tiêu đề): **Tuyệt đối cấm sửa chắp vá từng file với style khác nhau**.
* **Bắt buộc tạo 1 Component duy nhất (Single Source of Truth, ví dụ `UnifiedModalHeader.tsx`)** và quét toàn bộ dự án để áp dụng đồng loạt 100%.

### Điều 3: Quy Chuẩn 4 Lớp Thoát Hiểm An Toàn Tuyệt Đối (Quadruple Dismissal Safety)
Mọi Modal, Popup, Bottom Sheet trong ứng dụng chuyển đổi sang chuẩn Facebook-like **bắt buộc phải có đủ 4 cơ chế đóng**, tuyệt đối cấm để người dùng bị bẫy kẹt trong màn hình:
1. **Lớp 1 (Nút X trực quan):** Nút X nổi bật với tương phản cao (`zIndex: 9999`, `elevation: 20`, shadow, border), tự đảo màu theo nền, kích thước vùng bấm tối thiểu 44x44px.
2. **Lớp 2 (Cử chỉ vuốt):** Kéo vuốt xuống 120 FPS (`PanResponder`) có lực đàn hồi lò xo (Spring Physics), vượt ngưỡng 80px là tự trượt xuống đóng mượt mà.
3. **Lớp 3 (Chạm ra ngoài):** Lớp phủ mờ có `backdropTouch` (`{ ...StyleSheet.absoluteFillObject }`), chạm vào vùng trống là đóng ngay.
4. **Lớp 4 (Phím cứng Back):** Android `onRequestClose` kích hoạt đóng an toàn khi bấm nút Back vật lý.

### Điều 4: Quy Tắc Theme Tokens & Cấm Fix Cứng Mã Màu (Zero Hardcoded Hex)
* Nghiêm cấm fix cứng mã màu hex như `#FFFFFF` hay `#000000` vào background hoặc icon.
* Bắt buộc dùng Design Tokens (`theme.surfaceSolid`, `theme.surfaceSubtle`, `theme.textPrimary`, `theme.border`...) để tự động thích ứng chế độ Sáng/Tối (Light/Dark mode) mượt mà.

---

## 📋 3. TIÊU CHUẨN SCHEMA SERVER-DRIVEN UI (JSON SPECIFICATION)

Schema do Server phát hành tuân thủ cấu trúc phân cấp linh hoạt:

```json
{
  "appId": "xechung",
  "version": "2.0.0",
  "screens": {
    "passengerBooking": {
      "type": "Container",
      "id": "passenger_booking_root",
      "props": { "style": { "flex": 1, "backgroundColor": "theme.surfaceBackground" } },
      "children": [
        {
          "type": "CorridorSelector",
          "id": "route_corridor_picker",
          "props": {
            "title": "Tuyến Trọng Điểm",
            "routes": [
              { "id": "tn_hn", "label": "Thái Nguyên ➔ Hà Nội", "districts": ["Cầu Giấy", "Bạch Mai", "Hoàn Kiếm", "Mỹ Đình", "Nội Bài"] },
              { "id": "hn_tn", "label": "Hà Nội ➔ Thái Nguyên", "districts": ["TP Thái Nguyên", "Sông Công", "Phổ Yên", "Đại Từ"] }
            ]
          }
        },
        {
          "type": "RideTypeSelector",
          "id": "ride_type_toggle",
          "props": {
            "modes": [
              { "id": "ghep", "label": "Xe Ghép (Ghế)", "defaultPrice": "150.000đ" },
              { "id": "bao_xe", "label": "Bao Xe (4-7 Chỗ)", "defaultPrice": "450.000đ" },
              { "id": "hang_hoa", "label": "Gửi Đồ Cốp Xe", "defaultPrice": "100.000đ" }
            ]
          }
        },
        {
          "type": "SubmitButton",
          "id": "btn_confirm_booking",
          "props": { "title": "Đăng Chuyến Ngay", "variant": "primary" },
          "action": { "type": "api_call", "endpoint": "/api/v1/requests/create", "method": "POST" }
        }
      ]
    },
    "driverFeed": {
      "type": "Container",
      "id": "driver_feed_root",
      "props": { "style": { "flex": 1, "backgroundColor": "theme.surfaceBackground" } },
      "children": [
        {
          "type": "DriverStatusSelector",
          "id": "driver_status_radio",
          "props": {
            "mandatorySelection": true,
            "options": ["Đang đón khách", "Đang chạy", "Tạm nghỉ"]
          }
        },
        {
          "type": "DriverFeedList",
          "id": "feed_list",
          "props": { "feedUrl": "/api/v1/requests/feed", "maskPhone": true }
        },
        {
          "type": "NativeSlideToConfirm",
          "id": "slide_accept_trip",
          "props": { "sliderText": "Vuốt để nhận cuốc ngay", "haptic": true },
          "action": { "type": "api_call", "endpoint": "/api/v1/requests/accept", "method": "POST" }
        }
      ]
    }
  }
}
```

---

## 🛠️ 4. QUY TRÌNH THỰC THI 5 GIAI ĐOẠN CHI TIẾT

Khi nhận lệnh chuyển đổi dự án sang Facebook-like, AI thực hiện lần lượt 5 giai đoạn:

### Giai Đoạn 1: Sao Lưu An Toàn (Git Safety Snapshot)
1. Kiểm tra trạng thái Git trong thư mục dự án (`git status`).
2. Tự động commit lưu giữ toàn bộ mã nguồn trước khi chạm vào:
   ```bash
   git add -A && git commit -m "feat(backup): backup current state before Facebook-like migration"
   ```

### Giai Đoạn 2: Cô Lập Native Shell (Native Decoupling)
1. Giữ nguyên 100% các thành phần Native:
   - Cử chỉ vuốt ngang `SlideToConfirm.tsx` bằng `react-native-reanimated` Worklet.
   - Trình phát âm thanh cảnh báo TTS lái xe (`expo-speech` / `Audio`).
   - Định vị GPS và rung haptic.
   - Component header modal hợp nhất `UnifiedModalHeader.tsx` (4 lớp an toàn).
2. Đóng gói các module này thành danh mục Native Components có thể triệu gọi linh hoạt từ SDUI.

### Giai Đoạn 3: Dựng Bộ Thông Dịch SDUI (Client SDUI Engine)
1. Tạo thư mục `src/components/sdui/`:
   - `SDUIRenderer.tsx`: Component đệ quy duyệt qua mảng Schema JSON và vẽ Native Component thật (`View`, `Text`, `Button`, `SlideToConfirm`).
   - `SDUICacheManager.ts`: Lưu trữ Schema vào `AsyncStorage` / SQLite local. Nếu không có mạng hoặc mạng chập chờn, tự động nạp bản cache gần nhất để app mở lên trong **0.1 giây**!
   - `SDUIActionHandler.ts`: Xử lý các sự kiện `navigate`, `api_call`, `call_phone`, `copy_text`, `open_modal`.

### Giai Đoạn 4: Dựng API Server Phân Phối Schema & OTA
1. Trong backend Express (Node.js):
   - Tạo route `backend/src/routes/ota.ts`.
   - Endpoint `GET /api/v1/ota/check?version=X`: Trả về thông tin phiên bản mới nhất, SHA256 checksum và trạng thái bắt buộc cập nhật.
   - Endpoint `GET /api/v1/ota/bundle`: Trả về toàn bộ gói Schema JSON của tất cả màn hình.
2. Tích hợp nén gzip/brotli để gói bundle chỉ nặng khoảng **10-30 KB**, tải trong 0.2 giây.

### Giai Đoạn 5: Kiểm Thử Nghiệm Thu Vật Lý (Physical Verification)
1. Chạy Typecheck:
   ```bash
   npm run typecheck && npm run backend:typecheck
   ```
2. Chạy thử nghiệm trên iOS Simulator:
   - Kiểm tra cử chỉ vuốt ngang `SlideToConfirm` đạt 60/120 FPS trên máy ảo.
   - Thử nghiệm 4 cơ chế đóng modal (nút X, vuốt trượt kéo xuống, chạm nền ngoài, nút Back Android).
   - Thử ngắt mạng và mở lại app: Xác nhận cơ chế Offline Cache hoạt động mượt mà.
3. Đối soát bằng chứng vật lý theo chuẩn `anti-hallucination-audit-xskill`.

---

## 💡 5. CÁCH KÍCH HOẠT NHANH TỪ TELEGRAM

Khi Trương Tổng nhắn tin tại topic dự án (ví dụ `🚗 XeChung`):
- Khẩu lệnh: **"Cài rule facebook-like lên và làm theo rule với skill đó"**  
  *(hoặc: "Chuyển đổi dự án sang facebook-like theo skill", "Kích hoạt skill facebook-like")*
- Hệ thống sẽ:
  1. Tự động kiểm tra và gắn rule `facebook-like.md` vào thư mục dự án.
  2. Lên Kế hoạch (Plan) chi tiết gồm 5 giai đoạn cho anh bấm **"✅ Duyệt & Cho Làm Luôn"**.
  3. Sau khi anh duyệt: Đội ngũ BMad bắt tay viết code thật và báo cáo kèm diff file vật lý!

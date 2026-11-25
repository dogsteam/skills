---
name: facebook-like-xskill
description: >-
  Architects mobile apps with Zero-Store-Resubmit updates (Server Brain + Self-Hosted Signed JS OTA + Server-Driven UI) and Zero-Secret client security. Use when the user asks to apply "facebook-like", "update server không cần update app", "chỉ update server", "sửa code không cần nộp lại Store", "SDUI", "Server-Driven UI", "OTA", "tách Native Shell", or "chống dịch ngược APK/IPA". Not for building or uploading store binaries directly (use build-deploy-xskill or mobile-store-deploy).
---

# 🚀 FACEBOOK-LIKE ARCHITECTURE & ZERO-STORE-UPDATE SYSTEM

> **Mục tiêu tối thượng:** Nộp **Golden Native Shell** lên App Store / Google Play **một lần làm nền**. Từ đó về sau, mọi sửa đổi nghiệp vụ, giao diện, màn hình mới, tích hợp API đối tác mới hay vá lỗi TypeScript/React đều chỉ cập nhật từ **Server riêng (VPS)** trong vài giây mà **không cần nộp lại Store**, đồng thời **chống dịch ngược APK/IPA/Hermes 100%**.

---

## 🏗️ 1. KIẾN TRÚC 3 TẦNG (CHỐT CHẶN TOÀN DIỆN)

Kết hợp **cả 3 tầng** để giải quyết triệt để việc *chỉ dùng WebView sẽ mất 120 FPS & dễ bị Apple từ chối*, còn *chỉ dùng JSON SDUI thuần thì không sửa được logic TypeScript/màn hình tương tác mới*:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ TẦNG 3 — SERVER-ONLY BRAIN (Backend VPS · Bảo mật & Nghiệp vụ 100%)     │
│ • Toàn bộ công thức giá, chiết khấu, matching, mask SĐT, phân quyền     │
│ • Proxy toàn bộ Key thứ 3 (MapTiles, Geocoding, AI, Carrier, VietQR)    │
│ • Instant SDUI Engine (/api/v1/sdui/*) + Feature Flags (< 1s, 0 build)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS + Gzip + SHA-256 + RSA Signature
┌────────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 2 — SELF-HOSTED SIGNED JS/HERMES OTA (95% Code React/TS Động)      │
│ • Expo Updates Protocol v1 tự host trên VPS (/api/v1/ota/manifest)      │
│ • Đẩy màn hình mới, state, bugfix TS/React thẳng từ CLI -> VPS -> App   │
│ • Bắt buộc chữ ký RSA-2048 & Auto-Rollback nếu JS bundle lỗi lúc boot   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Gọi qua Registry Whitelist (Cấm eval)
┌────────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 1 — GOLDEN NATIVE SHELL (Nộp App Store & Google Play 1 lần)        │
│ • Reanimated 120 FPS (SlideToConfirm), PanResponder, Safe Area Modal    │
│ • Hardware Native: GPS, TTS Speech, Audio WAV, Push, SecureStore, Haptic│
│ • Secure OTA Loader (Public Cert) + SDUIRenderer + Offline Cache 0.1s   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ 2. SÁU BỘ POLICY BẤT BIẾN (ÁP DỤNG MỌI PHIÊN CODE SAU NÀY)

Cài ngay [templates/FACEBOOK_LIKE_PROJECT_RULE.md](./templates/FACEBOOK_LIKE_PROJECT_RULE.md) vào `AGENTS.md` hoặc `.agents/rules/` của dự án để mọi phiên AI về sau tự tuân thủ mà CTO không phải nhắc lại:

1. **`POLICY-1` — Two-Lane OTA Priority (Ưu tiên không chạm Store):**
   Mọi yêu cầu thay đổi tính năng/giao diện phải đi theo thứ tự từ nhẹ đến nặng: **(1) Backend API/Config ➔ (2) SDUI JSON Schema ➔ (3) Self-Hosted Signed JS OTA**. Chỉ đụng Native Shell khi phần cứng hệ điều hành chưa được cấp.
2. **`POLICY-2` — Native Shell Freeze & Technical Boundary Honesty (Khóa Vỏ Native):**
   *Lý do:* Chỉ cần thêm 1 package có code native hoặc sửa quyền OS là mất tính năng OTA và buộc nộp Store lại (đặc biệt Android 14 ngày test / Apple review).
   - **CẤM TỰ Ý:** Cài package có link `ios/` hoặc `android/`, sửa `Info.plist`, `AndroidManifest.xml`, code Swift/Kotlin, hoặc đổi `runtimeVersion`.
   - **TRUNG THỰC KỸ THUẬT:** Khi CTO hỏi *"Up server là xong đúng không?"* hoặc yêu cầu tính năng đòi hỏi phần cứng/SDK native chưa có trong Golden Shell, AI phải **DỪNG LẠI BÁO ĐỎ**, nêu chính xác phần nào Server/OTA làm được và phần nào bắt buộc build Store — tuyệt đối cấm hứa suông rồi làm người dùng mắc kẹt.
3. **`POLICY-3` — Zero-Secret & Zero-Math Client (Bảo mật Chống Dịch Ngược):**
   *Lý do:* Hacker dùng `jadx`, `hbctool` (dịch ngược Hermes `.hbc`), hoặc `class-dump` đọc được mọi logic & key nằm trong app client.
   - Tuyệt đối không đặt công thức tính tiền/chiết khấu, chấm điểm matching, hay fallback tính cước ở client.
   - Tuyệt đối không trả raw vendor keys (`mapTilesKey`, OpenAI, Carrier secret) về client — dùng **Backend Proxy** kèm session auth.
   - Server phải mask/ẩn dữ liệu nhạy cảm (SĐT khách khi chưa nhận đơn) ngay từ serializer backend.
   - **Cấm `eval()` / `new Function()`** hay nạp code JS không qua trình ký RSA của `expo-updates` để tránh RCE và tuân thủ Apple Guideline 2.5.2.
4. **`POLICY-4` — Signed Integrity, Offline Cache & Crash Immunity:**
   - Gói JS OTA bắt buộc ký **RSA-2048 (`expo-signature`)** bằng Private Key giữ ngoài VPS; native shell giữ Public Certificate.
   - SDUI JSON phải kiểm checksum SHA-256, lưu cache local để app mất mạng vẫn mở ngay trong 0.1 giây, và bọc trong `ErrorBoundary` + fallback tĩnh để không bao giờ treo trắng màn hình.
   - Bắt buộc cấu hình **Auto-Rollback** nếu JS bundle mới crash khi khởi động và nút **Rollback 1-click** trên Admin.
5. **`POLICY-5` — Systemic UI Consistency (Single Source of Truth & An Toàn Giao Diện):**
   - Thành phần dùng chung (header, modal, thẻ đơn) gom vào **1 component duy nhất**; màu sắc dùng **Theme Tokens**, không fix cứng hex phá hỏng Light/Dark mode.
   - Mọi Modal tuân thủ **4 Lớp Thoát Hiểm** (Nút `X` độ tương phản cao `zIndex: 9999`, vuốt kéo xuống PanResponder, chạm backdrop, nút Back Android) và **Safe Area Inset** chống đè tai thỏ/Dynamic Island (`Math.max(insets.top, Platform.OS === 'ios' ? 52 : 28)`).
   - Thao tác chuyển trạng thái quan trọng của tài xế dùng **`SlideToConfirm` Worklet 120 FPS** trên UI thread, không bật popup xác nhận lại.
6. **`POLICY-6` — Physical Audit Stop-Gate:**
   Trước khi báo *"Đã xong — chỉ cần update server"*, AI bắt buộc chạy script kiểm chứng [scripts/audit-facebook-like.mjs](./scripts/audit-facebook-like.mjs) và `typecheck` xác nhận **0 thay đổi Native ABI** và **0 rò rỉ secret/công thức**.

---

## 🛠️ 3. QUY TRÌNH TRIỂN KHAI 5 GIAI ĐOẠN (CHUYỂN ĐỔI HOẶC DỰNG MỚI)

1. **Sao lưu & Cài Policy cố định:**
   Commit an toàn bằng Git (`git add -A && git commit -m "chore: snapshot before facebook-like architecture"`). Nhúng [FACEBOOK_LIKE_PROJECT_RULE.md](./templates/FACEBOOK_LIKE_PROJECT_RULE.md) vào **`AGENTS.md`** ở thư mục gốc repo (nơi mọi agent harness tự động nạp) và/hoặc `.agents/rules/facebook-like.md`; nếu bật hook bảo vệ Native Shell thì copy `audit-facebook-like.mjs` vào `.agents/scripts/` và gắn [native-freeze-hook.json](./templates/native-freeze-hook.json) vào `.agents/hooks.json`.
   *Điều kiện xong:* File rule nằm trong `AGENTS.md` hoặc `.agents/rules/`, `git status` sạch để sẵn sàng đối chiếu Native diff.
2. **Dọn sạch Client Secret & Chuyển Nghiệp vụ lên Server:**
   Đọc [references/security-zero-secret-audit.md](./references/security-zero-secret-audit.md). Đưa toàn bộ tính toán giá, matching, map tiles proxy, masking về Backend.
   *Điều kiện xong:* Chạy `audit-facebook-like.mjs` phần Security báo **PASS** (0 secret/math leak ở `src/`).
3. **Cấy Golden Native Shell & Self-Hosted Signed OTA:**
   Đọc [references/golden-native-shell-checklist.md](./references/golden-native-shell-checklist.md) & [references/ota-protocol-and-signing.md](./references/ota-protocol-and-signing.md). Dự phòng sẵn quyền phần cứng 12–24 tháng, dọn placeholder `Info.plist`, tạo X.509 certificate bằng `scripts/publish-ota.mjs --keygen`, cài `expo-updates` trỏ về `/api/v1/ota/manifest` kèm Public Certificate & unified `runtimeVersion` (`"native-1"`). Dựng backend OTA route từ [templates/ota-server-route.ts](./templates/ota-server-route.ts).
   *Điều kiện xong:* Endpoint `/api/v1/ota/manifest` trả manifest hợp lệ có chữ ký `expo-signature`, OTA audit **PASS**.
4. **Tích hợp SDUI Engine & Chuẩn Modal 4 Lớp:**
   Đọc [references/sdui-universal-schema.md](./references/sdui-universal-schema.md) & [references/schema-specification.json](./references/schema-specification.json). Dựng `SDUIRenderer` ([templates/SDUIRenderer.tsx](./templates/SDUIRenderer.tsx)), Offline Cache ([templates/SDUICacheManager.ts](./templates/SDUICacheManager.ts)), Action Dispatcher whitelist ([templates/SDUIActionDispatcher.ts](./templates/SDUIActionDispatcher.ts)), và Modal/Header 4 lớp thoát hiểm ([templates/UnifiedModalHeader.tsx](./templates/UnifiedModalHeader.tsx)) cho các màn hình/form biến thiên thường xuyên.
   *Điều kiện xong:* Ngắt mạng mở lại app lên giao diện từ cache < 1s; sai schema tự fallback không crash.
5. **Nghiệm thu Vật lý & Nộp Bản Golden Native Shell:**
   Chạy `npm run typecheck`, test backend, chạy `node <path_to_skill>/scripts/audit-facebook-like.mjs --strict`, test 120 FPS trên Simulator/thiết bị thật. Sau khi kiểm chứng xong, nộp **Golden Native Shell** lần duy nhất qua `build-deploy-xskill` hoặc `mobile-store-deploy`. Những lần sửa JS/React về sau chỉ cần chạy `node <path_to_skill>/scripts/publish-ota.mjs --publish ...` đẩy lên VPS!

---

## 📚 BẢN ĐỒ TÀI LIỆU & CÔNG CỤ NẠP THEO NHU CẦU

| Cần làm gì? | Đọc / Chạy file tương ứng |
| :--- | :--- |
| Dựng hoặc kiểm tra Self-Hosted OTA & Ký số RSA | [references/ota-protocol-and-signing.md](./references/ota-protocol-and-signing.md) · [scripts/publish-ota.mjs](./scripts/publish-ota.mjs) |
| Thiết kế JSON SDUI, Component Registry, Theme Tokens | [references/sdui-universal-schema.md](./references/sdui-universal-schema.md) · [schema-specification.json](./references/schema-specification.json) |
| Kiểm tra chống dịch ngược APK/IPA/Hermes & Proxy API | [references/security-zero-secret-audit.md](./references/security-zero-secret-audit.md) |
| Chốt danh sách quyền/SDK trước khi nộp Store 1 lần | [references/golden-native-shell-checklist.md](./references/golden-native-shell-checklist.md) |
| Cài Rule & Hook khóa cứng cho mọi phiên AI sau này | [templates/FACEBOOK_LIKE_PROJECT_RULE.md](./templates/FACEBOOK_LIKE_PROJECT_RULE.md) · [templates/native-freeze-hook.json](./templates/native-freeze-hook.json) |
| Code mẫu SDUI, Cache, Dispatcher, Modal 4 lớp & Server Route | [templates/SDUIRenderer.tsx](./templates/SDUIRenderer.tsx) · [templates/SDUICacheManager.ts](./templates/SDUICacheManager.ts) · [templates/SDUIActionDispatcher.ts](./templates/SDUIActionDispatcher.ts) · [templates/UnifiedModalHeader.tsx](./templates/UnifiedModalHeader.tsx) · [templates/ota-server-route.ts](./templates/ota-server-route.ts) |
| Tự động kiểm toán Native Drift, OTA & Bảo mật | `node <skill_dir>/scripts/audit-facebook-like.mjs [project_dir]` |
| Sinh khóa X.509 & Đóng gói/Ký số bản JS OTA đẩy VPS | `node <skill_dir>/scripts/publish-ota.mjs --help` |

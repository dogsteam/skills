# Universal Server-Driven UI (SDUI v2) & Component Registry

> **Mục tiêu:** Cho phép thay đổi Form tạo đơn, Banner, Thẻ đơn hàng, Bảng cước, Thông báo, Thứ tự nút bấm và Feature Flags **ngay từ Admin Portal (< 1 giây)** mà **không cần build lại JS bundle hay restart app**.

---

## 1. Nguyên tắc Thiết kế Phi-Dự-Án (App-Agnostic)

Mọi component SDUI phải mang tên và props trừu tượng theo chức năng UI (`Section`, `Banner`, `MoneyInput`, `PhoneInput`, `ChipGroup`, `ActionButton`, `NativeSlideToConfirm`), tuyệt đối không đóng cứng logic riêng của 1 app cụ thể vào engine lõi.

---

## 2. Cấu trúc Bundle SDUI v2

Xem schema chi tiết tại [schema-specification.json](./schema-specification.json). Một payload chuẩn gồm 5 khối:
1. **`appId` & `schemaVersion`:** Định danh app (`shiptudo`, `xechung`, ...) và phiên bản schema client tương thích.
2. **`sha256` & `updatedAt`:** Checksum kiểm toàn vẹn trước khi lưu cache offline.
3. **`featureFlags`:** Dictionary cờ bật/tắt tính năng theo user/role/khu vực (ví dụ `quickOrderSmsMode: "shop_sms_link"`).
4. **`themeTokens`:** Design tokens chuẩn (cấm fix cứng màu hex lẻ tẻ trong từng màn):
   `surfaceBackground`, `surfaceSolid`, `surfaceSubtle`, `textPrimary`, `textSecondary`, `border`, `primary`, `success`, `warning`, `danger`.
5. **`screens`:** Bản đồ `{ [screenKey]: ComponentNode }`.

---

## 3. Native Registry Whitelist (Giữ 100% Độ Mượt Native)

`SDUIRenderer` chỉ render các node có `type` nằm trong Registry được biên dịch trong Native Shell. Không dùng WebView bọc màn hình chính và không `eval()` code JS từ string.

| Nhóm | Component Types Chuẩn | Mục đích |
| :--- | :--- | :--- |
| **Layout** | `Container`, `ScrollContainer`, `Card`, `Row`, `Column`, `Spacer`, `Divider` | Dàn trang chuẩn Flexbox + Safe Area |
| **Display** | `Text`, `Badge`, `Banner`, `StatCard`, `Icon` | Hiển thị số liệu, thông báo, huy hiệu |
| **Form Inputs** | `TextInput`, `MoneyInput`, `PhoneInput`, `ChipSelector`, `SwitchToggle` | Gắn kết hai chiều vào `formState[node.field]` |
| **Hardware & 120 FPS** | `NativeSlideToConfirm`, `VoiceMicButton`, `MapPreview`, `UnifiedModalHeader` | Cử chỉ Reanimated UI Thread, giọng nói TTS, nút X 4 lớp thoát hiểm |
| **Interaction** | `Button`, `ActionButton` | Bấm kích hoạt `SDUIAction` qua Dispatcher |

---

## 4. Điều kiện Hiển thị (`visibleWhen`) & Chèn Biến An Toàn

- **Không dùng `eval()`:** Hỗ trợ biểu thức điều kiện dạng cấu trúc tĩnh an toàn:
  ```json
  "visibleWhen": { "path": "featureFlags.quickOrderSmsMode", "equals": "shop_sms_link" }
  ```
  *(Các toán tử an toàn hỗ trợ: `equals`, `notEquals`, `in`, `truthy`, `falsy`, `gt`, `lt`)*.
- **Template Interpolation an toàn (`{{...}}`):** Chỉ đọc path thuần từ `{ form, data, flags, user }` bằng hàm truy xuất object lồng nhau an toàn (không thực thi biểu thức JavaScript). Ví dụ:
  `"https://domain.com/p/{{order.publicCode}}"`.

---

## 5. Whitelist Hành Động (`SDUIActionDispatcher`)

Mọi `action.type` chỉ được phép đi qua switch-case kiểm soát:
- `api_call`: Gọi API backend (`/api/v1/...`), tự động đính Bearer Token từ `SecureStore`, hỗ trợ `optimistic` / loading indicator, `onSuccess` (chuỗi action tiếp theo như `dismiss_modal` + `show_toast` + `open_sms`).
- `navigate`: Chuyển màn hình nội bộ trong router (`expo-router`).
- `open_modal` / `dismiss_modal`: Mở/đóng modal chuẩn 4 lớp thoát hiểm.
- `open_sms` / `call_phone` / `open_url`: Kiểm tra scheme an toàn (`sms:`, `tel:`, `https://`) trước khi gọi `Linking.openURL`.
- `copy_text`: Ghi vào clipboard bằng `expo-clipboard` + báo toast.
- `set_field`: Cập nhật giá trị trong `formState`.
- `show_toast`: Phát thông báo UI / rung haptic / đọc giọng nói TTS nếu `voicePrompt` được bật.

---

## 6. Offline Cache & ErrorBoundary (Mất Mạng Không Treo App)

1. **Instant Boot (`< 100ms`):** Lưu bản SDUI JSON hợp lệ gần nhất xuống `expo-file-system` / `AsyncStorage` kèm `sha256`. Khi mở app, nạp ngay từ ổ đĩa để hiển thị trong **0.1 giây**, đồng thời âm thầm gọi `/api/v1/sdui/check` ở nền.
2. **Component-Level `SDUIErrorBoundary`:** Bọc toàn bộ `<SDUIRenderer />` bằng React `ErrorBoundary`. Nếu server đẩy nhầm JSON thiếu field hoặc sai kiểu dẫn tới crash render, tự động ghi log lỗi về `/api/v1/telemetry/client-error` và rớt ngay về **Static Fallback Screen** tích hợp sẵn trong bundle JS.

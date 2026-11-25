# Security & Anti-Reverse-Engineering Audit (Zero-Secret Client)

> **Nguyên tắc sống còn:** Bất kỳ dòng JavaScript, Hermes Bytecode (`.hbc`), ảnh, hay cấu hình nào đã tải xuống điện thoại người dùng **đều có thể bị hacker dịch ngược** bằng `apktool`, `jadx`, `hbctool`, `class-dump`, hoặc bắt gói HTTPS bằng Charles/MitM Proxy. Vì vậy: **Mọi bí mật và thuật toán lõi CHỈ ĐƯỢC PHÉP TỒN TẠI TRÊN SERVER.**

---

## 1. Bảng Phân Định Ranh Giới Bảo Mật Tuyệt Đối

| Tài sản / Logic | Vị trí Bắt buộc | Lý do & Rủi ro nếu đặt ở Client |
| :--- | :---: | :--- |
| **API Keys hãng thứ 3**<br>*(Goong MapTiles/Geocode, Google Maps, OpenAI, J&T, Xanh SM, VietQR/PayOS/SePay, Firebase/APNs)* | **100% Backend** | Kẻ xấu dịch ngược lấy key đem xài chùa hết quota tiền hoặc gọi API trực tiếp phá hoại. |
| **Công thức tính giá, chiết khấu, hoa hồng, đối soát** | **100% Backend** | Đối thủ đọc sạch cấu trúc giá / % ăn chia; user có thể sửa request client gửi giá 0đ. |
| **Thuật toán Match & Sắp xếp ưu tiên** | **100% Backend** | Lộ logic chia đơn độc quyền; dễ bị tool auto-bot khai thác. |
| **Ẩn/Che dữ liệu nhạy cảm** *(SĐT khách trước khi nhận đơn, doanh thu đối tác)* | **Backend Serializer** | Nếu trả full SĐT xuống JSON rồi mới che `098****321` bằng JS UI, tool MitM đọc thấy số thật ngay lập tức! |
| **Định dạng hiển thị, validation UX nhẹ** | **Client** | Chỉ để phản hồi nhanh cho user; Backend **luôn validate & tính lại** ở request tạo/sửa đơn. |

---

## 2. Quy chuẩn Proxy Map Tiles & Dịch Vụ Ngoài

Không trả nguyên API Key bản đồ (ví dụ `mapTilesKey`) xuống WebView/Client qua `/api/v1/config/maps`. Áp dụng 1 trong 2 chuẩn sau:
1. **Backend Tile Proxy (An toàn tuyệt đối):** WebView gọi `https://<domain>/api/v1/maps/tiles/{z}/{x}/{y}?token=<short_lived_session>` -> Express server gắn Goong/Google key ở phía server, cache ngắn Redis/RAM và pipe ảnh về. Key gốc không bao giờ rời VPS.
2. **Short-Lived Scoped Key + Referer Lock (Tối thiểu nếu phải tải trực tiếp từ CDN):** Bắt buộc khóa `HTTP Referer` / Bundle ID trên portal nhà cung cấp key.

---

## 3. Rà soát Rò rỉ trước khi Đóng Gói (`Decompile Checklist`)

Trước khi phát hành OTA hoặc Native Shell, kiểm chứng toàn bộ các mục sau trên thư mục `src/`:
- [ ] Không có chuỗi dạng `sk-...`, `AIza...`, `secret`, `privateKey`, `Bearer ` hardcoded trong `src/`.
- [ ] Không có hàm tính đối soát tài chính (`settlement`, `commission`, `calculateFee`) được coi là nguồn sự thật ở client. Giao diện preview chỉ hiển thị kết quả trả về từ `/api/v1/quotes/preview` hoặc `/config/pricing`.
- [ ] Không còn lệnh gọi trực tiếp API nhà cung cấp ngoài (`api.openai.com`, `rsapi.goong.io`, `maps.googleapis.com`, `partner-carrier`) từ React Native — 100% phải đi qua backend riêng.
- [ ] Không sử dụng `eval()`, `new Function()`, hoặc `dangerouslySetInnerHTML` nhận chuỗi chưa kiểm duyệt từ internet.
- [ ] Toàn bộ Bearer Session Token của user trên thiết bị được lưu bằng `expo-secure-store` (Keychain/Keystore phần cứng), không lưu trần trong `AsyncStorage` hay log console ở bản release.

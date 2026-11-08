# 🛑 CHECKLIST 10 LỖI BỊ TỪ CHỐI PHỔ BIẾN NHẤT TRÊN GOOGLE PLAY CONSOLE & CÁCH KHẮC PHỤC

## 1. Lỗi Quyền Vị Trí Chạy Ngầm (`ACCESS_BACKGROUND_LOCATION`)
* **Nguyên nhân:** Khai báo vị trí nền mà không có video chứng minh hoặc tính năng không thực sự cần nền.
* **Cách khắc phục:**
  * Nếu app chỉ cần định vị khi đang mở app: **Chỉ xin `ACCESS_FINE_LOCATION` và `ACCESS_COARSE_LOCATION`**, gỡ bỏ hoàn toàn `ACCESS_BACKGROUND_LOCATION` trong `AndroidManifest.xml`.
  * Nếu là app tài xế cần theo dõi cuốc khi tắt màn hình: Phải dùng **Foreground Service with type `location`** (hiển thị thông báo cố định trên Notification Bar) và tải lên video YouTube quay màn hình thực tế gửi kèm cho Google.

## 2. Thiếu Chính Sách Quyền Riêng Tư (Privacy Policy)
* **Nguyên nhân:** Link bị 404, không có giao diện, hoặc không ghi rõ việc thu thập số điện thoại, danh bạ, vị trí.
* **Cách khắc phục:** Tạo 1 trang web công khai HTTPS chứa đầy đủ chính sách xử lý dữ liệu và gắn vào mục *Chính sách quyền riêng tư* trên Console.

## 3. Khai Báo An Toàn Dữ Liệu (Data Safety Form) Không Khớp Với Code
* **Nguyên nhân:** Mã nguồn có SDK phân tích (Firebase, Expo, Facebook SDK...) tự động đọc device ID hoặc IP nhưng trên form khai là "Không thu thập dữ liệu".
* **Cách khắc phục:** Khai báo trung thực:
  * Thu thập Vị trí (Location): Có (Dùng cho điều phối chuyến xe).
  * Thu thập Thông tin cá nhân (Tên, SĐT): Có (Dùng để xác thực tài khoản và gọi điện thoại).
  * Mã định danh thiết bị (Device ID): Có (Dùng để gửi Push Notification).

## 4. Quyền Truy Cập Ứng Dụng (App Access Credentials)
* **Nguyên nhân:** App yêu cầu đăng nhập bằng OTP gửi qua SMS thực tế, reviewer của Google ở nước ngoài không nhận được SMS nên không vào được bên trong app -> Từ chối ngay lập tức.
* **Cách khắc phục:**
  * Tạo sẵn tài khoản demo cố định trong backend:
    * SĐT: `0988888888`
    * OTP cố định: `123456`
  * Điền thông tin này vào mục *Quyền truy cập ứng dụng (App Access)* trong Console.

## 5. Vướng Chính Sách Gia Đình & Trẻ Em (Families Policy)
* **Nguyên nhân:** Chọn đối tượng mục tiêu có độ tuổi dưới 18.
* **Cách khắc phục:** Chỉ chọn nhóm tuổi **Từ 18 tuổi trở lên**.

## 6. Lỗi Icon & Ảnh Chụp Màn Hình (Screenshots)
* **Nguyên nhân:** Dùng ảnh mockup che khuất tính năng app, không có ảnh chụp màn hình thật của ứng dụng chạy trên điện thoại hoặc máy tính bảng.
* **Cách khắc phục:** Tải lên tối thiểu 4 ảnh chụp màn hình điện thoại thật độ phân giải tối thiểu 1080x1920 px.

## 7. Khai Báo Tính Năng Tài Chính / Vay Mượn (Financial Features)
* **Nguyên nhân:** App có từ khóa "Ví tài xế", "Nạp tiền", "Rút tiền" khiến bot của Google quét nhầm là ứng dụng cho vay nặng lãi hoặc ngân hàng lậu.
* **Cách khắc phục:** Trong phần khai báo tính năng tài chính: Khai rõ *"Ứng dụng không phải dịch vụ tài chính hay cho vay. Tính năng ví chỉ phục vụ trừ phí sàn nội bộ của đối tác tài xế vận tải"*.

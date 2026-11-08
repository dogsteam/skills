# 🧪 HƯỚNG DẪN CHI TIẾT VƯỢT ẢI CLOSED TESTING 20 TESTERS (14 NGÀY) GOOGLE PLAY

## 1. Bản Chất Quy Định Mới Của Google
Từ tháng 11/2023, Google áp dụng chính sách: **Tất cả các tài khoản Google Play Console cá nhân mới bắt buộc phải chạy chương trình Thử nghiệm khép kín (Closed Testing) với tối thiểu 20 người thử nghiệm chọn tham gia (opt-in) trong tối thiểu 14 ngày liên tục** trước khi có thể nộp đơn phát hành app công khai (Production).

---

## 2. Các Bước Thực Hiện Chi Tiết

### Bước 1: Chuẩn Bị Danh Sách Email Tester
* Chuẩn bị danh sách ít nhất 22-25 địa chỉ email Google (Gmail hoặc Google Workspace).
* Tuyệt đối không dùng email rác hoặc email ảo không đăng nhập được trên điện thoại Android thật.

### Bước 2: Tạo Danh Sách Trên Play Console
1. Truy cập **Google Play Console** -> Chọn Ứng dụng.
2. Điều hướng tới: **Kiểm thử (Test)** -> **Thử nghiệm khép kín (Closed Testing)**.
3. Bấm vào kênh thử nghiệm (mặc định là **Alpha** hoặc bấm **Tạo kênh mới** đặt tên là `Closed Beta`).
4. Chuyển sang tab **Người thử nghiệm (Testers)**:
   * Bấm **Tạo danh sách email**.
   * Đặt tên danh sách (ví dụ: `XeChung VIP Testers`).
   * Dán toàn bộ danh sách 25 email vào.
   * Bấm **Lưu thay đổi (Save changes)**.

### Bước 3: Lấy Link Tham Gia & Kích Hoạt Opt-in
* Cuộn xuống mục **Cách người thử nghiệm tham gia**:
  * Sao chép đường liên kết dạng:  
    `https://play.google.com/apps/testing/<com.yourcompany.app>`
* Gửi đường liên kết này cho tất cả các tester trong danh sách:
  1. Tester mở link trên trình duyệt điện thoại (phải đăng nhập đúng tài khoản Gmail đã đăng ký).
  2. Bấm nút màu xanh: **"Trở thành người thử nghiệm (Become a tester)"**.
  3. Bấm vào link chuyển tiếp tới Google Play Store: **"Tải ứng dụng trên Google Play"**.
  4. Cài đặt ứng dụng về máy và mở app lên ít nhất 1 lần.

### Bước 4: Duy Trì Thử Nghiệm Trong 14 Ngày
* Người thử nghiệm **không được gỡ cài đặt app** trong suốt 14 ngày.
* Thỉnh thoảng mở app ra thao tác thử để Google ghi nhận telemetry hoạt động (không coi là tài khoản chết).
* Trên dashboard của Google Play Console, thanh đếm ngược `Số ngày thử nghiệm còn lại` sẽ giảm dần từ 14 về 0.

### Bước 5: Nộp Đơn Xin Quyền Sản Xuất (Apply for Production)
Khi đồng hồ đếm ngược về 0 ngày và đủ 20 testers:
1. Bấm nút **Yêu cầu quyền truy cập bản phát hành công khai (Apply for production)**.
2. Trả lời bộ câu hỏi khảo sát của Google:
   * *Bạn đã tuyển chọn người thử nghiệm như thế nào?* -> Trả lời: Tuyển chọn từ tệp khách hàng thân thiết và đội ngũ tài xế chạy tuyến Thái Nguyên - Hà Nội.
   * *Họ đã đưa ra phản hồi gì?* -> Trả lời: Góp ý về giao diện chọn điểm đến quận huyện, tối ưu tốc độ tải danh sách cuốc.
   * *Bạn đã sửa những lỗi gì trong thời gian thử nghiệm?* -> Trả lời: Đã cập nhật 2 bản build sửa lỗi hiển thị và nâng cấp độ mượt của thanh vuốt nhận cuốc SlideToConfirm.
3. Sau khi gửi khảo sát, đội ngũ Google sẽ duyệt đơn trong vòng 2 đến 7 ngày.

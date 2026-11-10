---
name: evals-benchmark-xskill
description: Quy chuẩn & Kỹ năng Đánh giá Tự động E2E Evals & Benchmark (Độc quyền Trương Tổng): Tự động giả lập hành vi người dùng cuối (Simulated User), chạy kịch bản E2E kiểm tra toàn bộ luồng nghiệp vụ không cần người bấm tay, đo đạc latency, tỷ lệ thành công >= 98% mới cấp chứng nhận VERIFIED.
---

# 🧪 EVALS-BENCHMARK-XSKILL — QUY CHUẨN ĐÁNH GIÁ TỰ ĐỘNG HÓA E2E & BENCHMARK

> **Dành cho Toàn bộ Hệ sinh thái Ứng dụng của Trương Tổng:**  
> Tuyệt đối không để CTO phải vào bấm tay kiểm tra hoặc hỏi "Code xong chưa em?". Toàn bộ quy trình nghiệm thu phải do kịch bản E2E tự động hóa kiểm định và đo đạc.

---

## 1. NGUYÊN TẮC CỐT LÕI (GROUND TRUTH EVALUATION)
1. **Không nghiệm thu bằng lời hứa mồm:**
   - Một tính năng chỉ được đánh dấu là `VERIFIED` khi kịch bản E2E chạy thông suốt qua 100% các bước mà không phát sinh ngoại lệ.
2. **Tiêu chuẩn Benchmark:**
   - Tỷ lệ hoàn thành tác vụ (Success Rate) $\ge 98\%$.
   - Độ trễ phản hồi API cục bộ (Latency) $< 200\text{ms}$.
   - Cử chỉ giao diện (UI FPS) đạt chuẩn mượt mà 60/120 FPS trên Simulator.
3. **Mô phỏng người dùng cuối (Simulated User Robot):**
   - Đóng vai cả 2 đầu: Hành khách (Passenger) và Tài xế (Driver) hoặc Khách hàng và Admin.
   - Tự động phát sinh dữ liệu thử nghiệm, tự gọi API hoặc điều khiển giao diện qua Maestro / CLI.

---

## 2. MA TRẬN KỊCH BẢN KIỂM THỬ MẪU (CHO XE CHUNG & CÁC DỰ ÁN)
1. **Kịch bản Hành khách Đặt xe:**
   - Tạo yêu cầu: Tuyến Hà Nội (Cầu Giấy) ⇋ Thái Nguyên (TP Sông Công).
   - Kiểm tra: Bắt buộc phải có `destination_district`, thời gian chỉ trong hôm nay/ngày mai.
2. **Kịch bản Sàn cuốc & Bảo vệ Riêng tư:**
   - Tài xế xem feed: Số điện thoại khách **bắt buộc bị che** (`098****321`).
3. **Kịch bản Ví & Nhận cuốc:**
   - Kiểm tra số dư ví $\ge 15.000đ$.
   - Thực hiện vuốt `SlideToConfirm`: Trừ tiền ví tức thì, mở khóa 100% số điện thoại thật.

---

## 3. QUY TRÌNH THỰC THI EVALS
```bash
# 1. Chạy Unit Test & Integration Test:
npm test

# 2. Chạy E2E Evals Benchmark Suite:
npm run test:e2e || node test/e2e-benchmark.mjs

# 3. Xuất báo cáo vật lý kèm thời gian đo đạc:
# Success Rate: 100% | Latency: 45ms | Verdict: PASSED
```

---
name: anti-hallucination-audit
description: >-
  Thẩm định sự thật & Cấm báo cáo láo (Độc quyền CTO Trương Tổng): Bắt buộc kiểm tra chéo bằng chứng vật lý
  (diff mã nguồn, timestamp file qua stat, kiểm tra dist/ và RAM, test pass thật, ảnh chụp simulator thật)
  trước khi xác nhận bất kỳ tính năng hoặc nhiệm vụ nào là đã hoàn thành. Áp dụng cho toàn bộ dự án thuộc hệ sinh thái.
---

# 🛡️ SKILL: ANTI-HALLUCINATION & FACT-VERIFICATION AUDIT (TRƯƠNG TỔNG SPEC)

> **QUY TẮC CỐT TỬ TỪ TRƯƠNG TỔNG (CTO):**  
> *"Tuyệt đối cấm báo cáo láo. Báo cáo láo là làm mù hệ thống và tự giết chết chính mình. Mọi kết luận 'Đã làm', 'Đã sửa' đều phải chứng minh bằng file vật lý, diff code, lệnh build dist và test pass thật, cấm nghe tin nhắn mồm từ bot hoặc suy diễn từ log giao tiếp!"*

---

## 🎯 KHI NÀO KÍCH HOẠT SKILL NÀY?
* Khi CTO yêu cầu: *"Kiểm tra cho anh", "Rà soát 20 yêu cầu gần nhất", "Nghiệm thu tính năng", "Xem xong chưa"*.
* Trước khi AI chuẩn bị phát biểu câu: *"Đã hoàn thành"*, *"Đã sửa xong"*, *"Tất cả bài test PASS"*.
* Bất cứ khi nào nghi ngờ bot bị ảo giác, bị treo 10 phút, hoặc chụp nhầm ảnh của hệ thống khác.

---

## 📋 QUY TRÌNH 5 BƯỚC THẨM ĐỊNH SỰ THẬT (5-STEP GROUND TRUTH AUDIT)

### BƯỚC 1: ĐỐI CHIẾU THỜI GIAN SỬA FILE VẬT LÝ (`stat`)
* **Hành động bắt buộc:** Chạy lệnh kiểm tra thời gian ghi đĩa của file mục tiêu:
  ```bash
  stat -f "%Sm %N" -t "%Y-%m-%d %H:%M:%S" <duong_dan_file>
  ```
* **Quy chuẩn đối chiếu:**
  - Nếu file được sửa **SAU** thời điểm nhận lệnh -> Đã có tác động mã nguồn thực tế.
  - Nếu file giữ nguyên ngày giờ từ trước -> **CHƯA ĐỤNG ĐẾN CODE, CẤM BÁO CÁO LÀ ĐÃ LÀM!**

---

### BƯỚC 2: RÀ SOÁT NỘI DUNG THAY ĐỔI (`git diff` & INSPECTION)
* **Hành động bắt buộc:**
  ```bash
  git status -s
  git diff <file>
  ```
* Nếu dự án chưa tạo git, phải dùng công cụ đọc file (`read_file`) để trích dẫn:
  - Đường dẫn file tuyệt đối: `[file.ts](file:///absolute/path/to/file.ts#L15-L35)`.
  - Tên hàm, tên biến hoặc logic cụ thể vừa sửa.
  - CẤM nói chung chung: *"Em đã tối ưu"*, *"Em đã hoàn thiện logic"*.

---

### BƯỚC 3: KIỂM TRA BIÊN DỊCH & BỘ NHỚ RAM (BUILD & PROCESS AUDIT)
* Với dự án TypeScript / Node.js chạy từ `dist/`:
  - Kiểm tra lệnh build đã chạy chưa: `npm run build` (`tsc`).
  - Kiểm tra timestamp của file trong `dist/` có mới hơn file trong `src/` không.
  - Nếu là bot/daemon chạy ngầm: Phải xác nhận đã restart tiến trình mới (`PID` mới). Nếu code `.ts` sửa mà tiến trình Node.js vẫn giữ PID cũ thì máy tính vẫn đang chạy code cũ -> **PHẢI BÁO RÕ LÀ CHƯA NẠP VÀO RAM!**

---

### BƯỚC 4: NGHIỆM THU KIỂM THỬ THỰC TẾ (TEST EXECUTION)
* Chạy lệnh kiểm thử tự động:
  ```bash
  npm test
  npm run typecheck
  ```
* Bắt buộc kiểm tra Exit code = 0.
* Nếu có lỗi test hoặc typecheck có lỗi `error TS...`, phải ghi nhận trung thực là **ĐANG LỖI KIỂM THỬ**, tuyệt đối cấm báo Pass bừa.

---

### BƯỚC 5: XÁC THỰC NGUỒN GỐC HÌNH ẢNH (VISUAL AUDIT INTEGRITY)
* **Quy tắc bất biến:**
  1. **Tác vụ phi-giao-diện (Non-UI Tasks):**
     - Các tác vụ như build AAB/APK, upload Google Play Console / App Store, nạp CSDL, sửa gitignore, deploy VPS: **TUYỆT ĐỐI KHÔNG CHỤP ẢNH GIAO DIỆN VÔ DUYÊN**.
  2. **Mobile App (`XeChung`, `AnNhanh`, `ShipTuDo`...):**
     - Phải kiểm tra app mục tiêu có đang thực sự chạy trên màn hình máy ảo không (`xcrun simctl spawn booted launchctl list`).
     - **TUYỆT ĐỐI CẤM chụp màn hình chính (Home Screen / SpringBoard có lịch, bản đồ, widget) của Apple khi app chưa mở!**
  3. **Web App:**
     - Kiểm tra tiến trình đang chiếm cổng: `lsof -i :<port>`.
     - Phải chắc chắn tiến trình đó thuộc dự án đang làm.
  4. **Vùng cấm tuyệt đối:**
     - CẤM chụp cổng `8080` của phần mềm bệnh viện hoặc ứng dụng khác đang chạy trên máy Mac.
     - CẤM dùng ảnh lưu sẵn, ảnh mockup dựng sẵn.
     - Nếu app chưa mở hoặc dev server chưa bật: Báo cáo trung thực *"Chưa mở màn hình app để chụp"*.

---

## 📊 MẪU BẢNG BÁO CÁO MINH BẠCH (ZERO FALSE POSITIVES)

Khi lập bảng kiểm tra cho Trương Tổng, chỉ được dùng 6 trạng thái sau:

| STT | Yêu Cầu Của CTO | Bằng Chứng Mã Nguồn (File & Timestamp) | Build & RAM Status | Test Status | Kết Luận Thực Tế |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | *Yêu cầu A* | `src/lib/a.ts` (07:15) | Đã `npm run build`, Bot PID mới | `npm test` PASS | ✅ **ĐÃ THI CÔNG HOÀN TẤT** |
| 2 | *Yêu cầu B* | `src/b.ts` (07:10) | Chưa build ra `dist/` | Chưa chạy test | ⚠️ **CHƯA NẠP VÀO RAM** |
| 3 | *Yêu cầu C* | Chưa sửa file nào trong `src/` | Chưa build | Không có | 📋 **MỚI LÊN KẾ HOẠCH (CHƯA CODE)** |
| 4 | *Yêu cầu D* | Đang sửa dở, typecheck lỗi | Chưa build | `error TS2304` | 🛠️ **ĐANG THI CÔNG DỞ DANG** |
| 5 | *Yêu cầu E* | Quá 10 phút bị ngắt an toàn | Tiến trình bị kill | Chưa hoàn thành | ⏳ **TẠM DỪNG (TIMEOUT)** |
| 6 | *Yêu cầu F* | Chưa đụng mã nguồn | Chưa làm gì | Không có | ❌ **CHƯA LÀM** |

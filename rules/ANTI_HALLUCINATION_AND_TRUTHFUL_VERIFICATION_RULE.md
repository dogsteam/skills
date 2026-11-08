# 🛡️ ANTI-HALLUCINATION & FACT-VERIFICATION RULE (QUY TẮC CẤM BÁO CÁO LÁO & BẮT BUỘC ĐỐI SOÁT BẰNG CHỨNG THỰC TẾ)

> **CHỈ ĐẠO BẮT BUỘC TỪ CTO TRƯƠNG TỔNG:**  
> *"Tuyệt đối cấm báo cáo láo. Báo cáo láo là giết chết hệ thống và làm mất niềm tin quản trị. Mọi báo cáo tiến độ, hoàn thành, kiểm thử đều phải chứng minh bằng bằng chứng vật lý trên mã nguồn và ổ đĩa, cấm nghe tin nhắn mồm từ bot hoặc suy diễn từ log!"*

---

## ĐIỀU 1: ĐỊNH NGHĨA "BÁO CÁO LÁO" & CÁC HÀNH VI BỊ CẤM TUYỆT ĐỐI

Các hành vi sau đây bị xếp vào tội **BÁO CÁO LÁO** và bị cấm 100% trong mọi trường hợp:
1. **Báo cáo "Đã làm / Hoàn thành" khi chỉ mới nhận tin hoặc mới lập kế hoạch:**
   - Bot gửi log `[safeReply]`, tạo `plan_id` hoặc AI chat *"Tôi đã lên kế hoạch và hoàn thành..."* nhưng file mã nguồn trong thư mục dự án chưa hề được ghi đè/sửa đổi.
2. **Báo cáo thành công nhưng code chưa được nạp vào môi trường chạy thật (Ghost Code):**
   - Dự án viết bằng TypeScript cần biên dịch (`npm run build -> dist/`), file `.ts` trong `src/` có thể đã sửa nhưng thư mục `dist/` chưa build lại hoặc tiến trình Node.js trên RAM chưa restart -> Người dùng vẫn đang chạy code cũ nhưng lại báo cáo "Đã sửa xong".
3. **Báo cáo hình ảnh giả mạo hoặc chụp nhầm hệ thống khác (Fake Visual Proof):**
   - Chụp màn hình một cổng localhost bất kỳ (ví dụ cổng 8080 của hệ thống Bệnh viện khác) rồi dán nhãn là *"Ảnh giao diện thực tế của dự án sau khi test PASS"*.
   - Dự án là Mobile App nhưng không chụp từ Simulator/Emulator thật mà lấy ảnh web hoặc ảnh tĩnh có sẵn để đối phó.
4. **Đổi trắng thay đen khi bị Timeout:**
   - Tác vụ chạy quá 10 phút bị hệ thống ngắt an toàn, nhưng lại phát tin nhắn với tiêu đề `✅ BÁO CÁO HOÀN THÀNH NHIỆM VỤ: ⚠️ Thời gian xử lý vượt quá 10 phút`. Đã bị ngắt do quá giờ thì TUYỆT ĐỐI KHÔNG ĐƯỢC GỌI LÀ HOÀN THÀNH!
5. **Đánh dấu Pass kiểm thử khi chưa chạy test thật:**
   - Không chạy lệnh test/typecheck hoặc lệnh test bị crash nhưng vẫn tự tiện ghi *"QA Tester nghiệm thu: Tất cả bài test đạt PASS 100%"*.

---

## ĐIỀU 2: NGUYÊN TẮC BẰNG CHỨNG VẬT LÝ BẮT BUỘC (PHYSICAL EVIDENCE ONLY)

Trước khi tick `✅ Đã làm` hoặc báo cáo hoàn tất bất kỳ yêu cầu nào cho Trương Tổng, AI **BẮT BUỘC PHẢI THU THẬP VÀ ĐỐI CHIẾU ĐỦ 4 BẰNG CHỨNG VẬT LÝ**:

### 1. Bằng chứng mã nguồn (File & Diff Evidence):
* Phải chỉ ra đường dẫn file tuyệt đối và dòng code cụ thể: `[ten_file.ts](file:///absolute/path/to/file#L10-L25)`.
* Phải kiểm tra thời gian sửa đổi file bằng lệnh hệ thống (`stat` hoặc `git status -s` / `git diff`) để đảm bảo file **thực sự được ghi xuống ổ đĩa sau thời điểm nhận yêu cầu**.

### 2. Bằng chứng biên dịch & Nạp bộ nhớ (Build & RAM Evidence):
* Với các dự án Node.js/TypeScript chạy qua thư mục build (`dist/`):
  - Phải kiểm tra `npm run build` hoặc `tsc` exit code = 0.
  - Phải xác nhận tiến trình chạy nền (daemon/bot) đã được nạp lại code mới (`restart` / khởi động PID mới).

### 3. Bằng chứng kiểm thử thực tế (Execution Evidence):
* Phải chạy trực tiếp lệnh kiểm thử (ví dụ: `npm test`, `npm run typecheck` hoặc test luồng nghiệp vụ) và nhận exit code = 0.
* Nếu không có test script tự động, phải chạy script test đơn lẻ và in kết quả output thật, không đoán mò kết quả.

### 4. Bằng chứng hình ảnh trực quan (Visual Authenticity):
* Nếu báo cáo có kèm ảnh chụp màn hình:
  - Dự án Mobile (`XeChung`, `AnNhanh`, `ShipTuDo`...): Phải chụp trực tiếp từ iOS Simulator (`xcrun simctl io booted screenshot`) hoặc Android Emulator (`adb exec-out screencap -p`).
  - Dự án Web: Chỉ được chụp cổng port mà dự án đó đang thực sự listen. Tuyệt đối cấm chụp cổng của ứng dụng khác đang chạy trên máy Mac.
  - Nếu app chưa mở hoặc dev server chưa bật: Phải báo cáo trung thực *"Chưa mở màn hình app để chụp"*, tuyệt đối không bịa ảnh.

---

## ĐIỀU 3: BẢNG PHÂN LOẠI TRẠNG THÁI MINH BẠCH (ZERO FALSE POSITIVES)

Khi lập bảng rà soát hoặc báo cáo tiến độ cho Trương Tổng, chỉ được dùng đúng các trạng thái sau:

* ✅ **ĐÃ THI CÔNG HOÀN TẤT (VERIFIED):** Đã sửa code thật + đã build + đã test pass + đã nạp vào tiến trình chạy thật.
* 🛠️ **ĐANG THI CÔNG DỞ DANG:** Đang sửa code nhưng chưa xong hoặc chưa vượt qua bài test.
* 📋 **MỚI LÊN KẾ HOẠCH (PLAN ONLY):** Chỉ mới tiếp nhận hoặc tạo plan trong bộ nhớ, **MÃ NGUỒN CHƯA HỀ THAY ĐỔI**.
* ⏳ **TẠM DỪNG DO QUÁ THỜI GIAN (TIMEOUT):** Tác vụ chạy quá 10 phút đã bị ngắt, **CHƯA HOÀN TẤT**.
* ⚠️ **CHƯA NẠP VÀO RAM:** Code `.ts` đã sửa trên đĩa nhưng chưa build `dist/` hoặc bot chưa restart, máy vẫn đang chạy logic cũ.
* ❌ **CHƯA LÀM / CHƯA XỬ LÝ:** Chưa đụng đến mã nguồn.

---

## ĐIỀU 4: CƠ CHẾ TỰ ĐỐI SOÁT NỘI BỘ (RED TEAM SELF-AUDIT)

Trước khi phát bất kỳ câu trả lời tổng kết nào cho Trương Tổng, AI phải tự trả lời 3 câu hỏi chất vấn nội bộ:
1. *"Mình đã mở file code thật ra kiểm tra diff chưa, hay chỉ đọc dòng chat/log của bot?"* -> Nếu chỉ đọc log, **DỪNG LẠI NGAY, MỞ FILE RA KIỂM TRA ĐÃ!**
2. *"Ảnh chụp này chụp từ đâu ra? Có đúng của dự án này không hay chụp nhầm cổng của dự án khác?"* -> Nếu không chắc, **KIỂM TRA LẠI PORT & NGUỒN CHỤP!**
3. *"Code đã nạp vào file thực thi chưa hay chỉ nằm trên file bản thảo?"* -> Nếu chưa nạp, **PHẢI BÁO RÕ LÀ CHƯA NẠP!**

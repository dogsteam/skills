---
name: pitfall-memory-xskill
description: Bảo tàng Cạm bẫy & Tích lũy Tri thức Sống (Độc quyền Trương Tổng): Tự động ghi nhớ mọi lỗi lầm kỹ thuật, bài học thực chiến, ranh giới dự án vào kho tri thức memory sống động cho từng dự án, ngăn chặn vĩnh viễn việc tái phạm lỗi cũ.
---

# 📚 PITFALL-MEMORY-XSKILL — BẢO TÀNG CẠM BẪY & KHO TRI THỨC TIẾN HÓA

> **Nguyên tắc vàng:**  
> *"Vấp ngã một lần là bài học. Vấp ngã lần hai cùng một lỗi là thiếu năng lực kiến trúc. Toàn bộ lỗi lầm kỹ thuật phải được đúc kết thành Luật bất biến."*

---

## 1. CẤU TRÚC KHO LƯU TRỮ TRI THỨC (PITFALL VAULT)
Mỗi dự án trong hệ sinh thái duy trì file cẩm nang và kho cạm bẫy riêng:
* Vị trí lưu trữ: `output/pitfalls.json` hoặc mục `## CÁC BÀI HỌC KINH NGHIỆM & CẠM BẪY ĐÃ XỬ LÝ` trong `AGENTS.md`.

## 2. ĐỊNH DẠNG MỘT BẢN GHI CẠM BẪY (PITFALL ENTRY)
```json
{
  "id": "PITFALL-2026-001",
  "project": "XeChung",
  "title": "Telegram Drop Updates & Process Restart Amnesia",
  "rootCause": "Lệnh bot.start cấu hình drop_pending_updates: true làm rơi tin nhắn khi daemon reload, bộ nhớ RAM bị reset.",
  "permanentFix": "Đổi sang drop_pending_updates: false, ghi nhận trạng thái tác vụ xuống output/active_tasks_persistence.json và kích hoạt resumeInterruptedTasks khi onStart.",
  "preventionRule": "Mọi tiến trình tác vụ chạy ngầm bắt buộc phải ghi xuống đĩa cứng, cấm dựa vào RAM đơn thuần."
}
```

## 3. QUY TẮC NẠP TRI THỨC VÀO QUY TRÌNH
1. **Trước khi bắt tay vào code bất kỳ dự án nào:**
   - KTS Trưởng và Dev Amelia phải quét nhanh các Pitfalls đã ghi nhận của dự án đó.
2. **Khi phát hiện nguy cơ tái phạm:**
   - Cảnh báo lập tức: `⚠️ Phát hiện nguy cơ dính Pitfall PITFALL-XXX, tự động kích hoạt phương án phòng vệ đã lưu!`.

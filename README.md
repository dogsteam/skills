# 🧰 BỘ KỸ NĂNG & QUY TẮC CỐT LÕI HỆ SINH THÁI TRƯƠNG TỔNG (DOGSTEAM SKILLS)

> **Kho lưu trữ kỹ năng chuẩn hóa (Standardized Skills Hub)** dành riêng cho toàn bộ các dự án trong hệ sinh thái của **CTO Trương Tổng** (`XeChung`, `AnNhanh`, `ShipTuDo`, `VnCheap.com`, `ITDeM`, `Thailab`...).  
> Mọi dự án mới khi khởi tạo bắt buộc phải nạp bộ kỹ năng và quy tắc này để đảm bảo kỷ luật kỹ thuật và tốc độ triển khai vượt trội!

---

## 📂 DANH MỤC SKILLS & RULES

```
skills/
├── README.md                                                 ★ Hướng dẫn tổng thể
│
├── rules/
│   ├── ANTI_HALLUCINATION_AND_TRUTHFUL_VERIFICATION_RULE.md  ★ Quy tắc cấm báo cáo láo & đối soát bằng chứng
│   └── FACEBOOK_LIKE_ARCHITECTURE_RULE.md (facebook-like.md) ★ Quy tắc kiến trúc 2 tầng Native Shell & Dynamic OTA
│
├── anti-hallucination-audit/ (anti-hallucination-audit-xskill)★ SKILL 1: Thẩm định sự thật & chống báo cáo láo
│   ├── SKILL.md
│   └── scripts/
│       └── verify-ground-truth.mjs                           Script kiểm tra chéo 5 bước tự động
│
├── node-sea-pack-and-update/ (node-sea-pack-and-update-xskill)★ SKILL 2: Đóng gói Node SEA & Hot-Deploy VPS
│   ├── SKILL.md
│   └── scripts/
│       ├── build-windows-exe.mjs                             Đóng gói Windows EXE độc lập (~89MB)
│       ├── deploy-to-vps.mjs                                 Stream chunked 64KB hot-update qua port VPS
│       ├── build-and-publish-apk.mjs                         Build Android APK đẩy lên GitHub Downloads
│       └── build-production-ios-local.mjs                    Build iOS IPA cục bộ bằng Xcode
│
├── mobile-store-deploy/ (mobile-store-deploy-xskill)          ★ SKILL 3: Phát hành AAB/IPA lên Google Play & Apple ASC
│   ├── SKILL.md
│   └── references/
│       ├── google-play-closed-testing.md                     Vượt ải 20 tester 14 ngày & khảo sát mở Production
│       ├── google-play-rejection-checklist.md                Checklist 10 lỗi bị từ chối phổ biến trên Play Console
│       └── apple-appstore-connect.md                         Fast-track nộp IPA trực tiếp lên App Store Connect
│
├── facebook-like-xskill/ (facebook-like)                     ★ SKILL 4: Chuyển đổi Kiến trúc Facebook-like (SDUI & OTA)
│   └── SKILL.md                                              Native Shell 120 FPS Reanimated, Instant Dynamic OTA, giấu 100% thuật toán
│
└── build-deploy-xskill/                                      ★ MASTER SKILL: Đệ chuyên trách Build & Deploy đa nền tảng
    └── SKILL.md                                              Điều hành tổng lực EXE, APK, AAB, IPA, VPS, Stores, Simulator
```

---

## ⚡ HƯỚNG DẪN TÍCH HỢP VÀO DỰ ÁN MỚI

### Cách 1: Nạp trực tiếp vào thư mục dự án
Trong bất kỳ thư mục dự án nào (ví dụ `XeChung`, `ShipTuDo`), chạy lệnh:
```bash
# Tạo thư mục skills và clone bộ công cụ về:
mkdir -p .agents/skills
git clone https://github.com/dogsteam/skills.git .agents/skills/dogsteam
```

### Cách 2: Chạy kiểm tra chống báo cáo láo tức thì
Để nghiệm thu bất kỳ tính năng nào trước khi bàn giao cho CTO:
```bash
node /Users/macs/Desktop/Dev/skills/anti-hallucination-audit/scripts/verify-ground-truth.mjs
```

### Cách 3: Đóng gói và đẩy máy chủ trong nháy mắt
```bash
# 1. Đóng gói Windows Portable EXE:
node /Users/macs/Desktop/Dev/skills/node-sea-pack-and-update/scripts/build-windows-exe.mjs

# 2. Hot-deploy lên VPS:
node /Users/macs/Desktop/Dev/skills/node-sea-pack-and-update/scripts/deploy-to-vps.mjs 180.93.120.217 1994 <SECRET>
```

---

## 🔒 BẢN QUYỀN & TIÊU CHUẨN
* Phát triển bởi **Kiến trúc sư trưởng Antigravity** theo sự chỉ đạo trực tiếp của **CTO Trương Tổng**.
* Toàn quyền sở hữu thuộc về tổ chức **DogsTeam** (`dogsteam`).

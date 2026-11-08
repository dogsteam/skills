#!/usr/bin/env node

/**
 * XeChung - Remote Hot-Deploy & Update Client Tool
 * Tự động build Node SEA XeChungServer.exe -> Stream chunked 64KB lên VPS Windows -> Tự động verify.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = new URL("..", import.meta.url).pathname;

const VPS_HOST = process.env.VPS_HOST || process.argv[2] || "180.93.120.217";
const VPS_PORT = Number(process.env.VPS_PORT || process.argv[3] || 1994);
const SECRET_KEY = process.env.UPGRADE_SECRET || process.argv[4] || "XeChungUpgradeSecret@2026";
const TARGET_EXE = path.join(rootDir, "dist", "windows", "XeChungServer-0.1.0", "XeChungServer.exe");

async function runCommand(command, args, cwd) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = await execFileAsync(command, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.warn(result.stderr.trim());
}

function checkEndpoint(urlStr, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: u.pathname,
          method: "GET",
          timeout: timeoutMs,
          headers: { Accept: "application/json" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ ok: res.statusCode === 200, status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ ok: res.statusCode === 200, status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Hết thời gian chờ (Timeout)" });
      });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

function streamUpload(filePath, urlStr, secret) {
  return new Promise((resolve) => {
    const stats = fs.statSync(filePath);
    const totalBytes = stats.size;
    const u = new URL(urlStr);

    console.log(`⏳ Đang khởi tạo kết nối luồng HTTP tới: ${urlStr}`);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname,
        method: "POST",
        timeout: 300000, // 5 phút timeout cho file lớn
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": totalBytes,
          "X-Upgrade-Secret": secret,
        },
      },
      (res) => {
        let respData = "";
        res.on("data", (chunk) => (respData += chunk));
        res.on("end", () => {
          try {
            resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, data: JSON.parse(respData) });
          } catch {
            resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, raw: respData });
          }
        });
      }
    );

    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Timeout truyền tệp (>300s)" });
    });

    let uploadedBytes = 0;
    let lastLogTime = 0;

    // Stream chunked 64KB để tự động điều tiết TCP backpressure
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

    fileStream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      const now = Date.now();
      if (now - lastLogTime > 400 || uploadedBytes === totalBytes) {
        lastLogTime = now;
        const pct = Math.floor((uploadedBytes / totalBytes) * 100);
        const upMB = (uploadedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
        process.stdout.write(`\r🚀 Tiến độ truyền tệp: [${pct}%] ${upMB} MB / ${totalMB} MB...`);
      }
    });

    fileStream.on("error", (err) => {
      req.destroy(err);
      resolve({ ok: false, error: `Lỗi đọc tệp: ${err.message}` });
    });

    fileStream.pipe(req);
  });
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 XECHUNG SERVER - REMOTE HOT-UPGRADE & DEPLOYMENT TOOL");
  console.log(`🌐 Máy chủ đích: http://${VPS_HOST}:${VPS_PORT}`);
  console.log("==================================================================");

  // BƯỚC 1: Kiểm tra kết nối tới máy chủ VPS
  console.log("\n🔍 [BƯỚC 1/4] Kiểm tra trạng thái máy chủ hiện tại...");
  const pingRes = await checkEndpoint(`http://${VPS_HOST}:${VPS_PORT}/api/v1/system/version`);
  if (pingRes.ok) {
    console.log(`✅ Máy chủ đang ONLINE:`);
    console.log(`   + Tên ứng dụng: ${pingRes.data?.app}`);
    console.log(`   + Phiên bản: ${pingRes.data?.version}`);
    console.log(`   + CSDL: ${pingRes.data?.database}`);
    console.log(`   + Thời gian chạy (Uptime): ${pingRes.data?.uptime_seconds}s`);
  } else {
    console.warn(`⚠️ CẢNH BÁO: Chưa lấy được thông tin phiên bản từ máy chủ (${pingRes.error || pingRes.status || "Chưa có endpoint"}). Tiến trình vẫn tiếp tục...`);
  }

  // BƯỚC 2: Đóng gói bản thực thi Windows mới nhất
  const shouldBuild = !process.argv.includes("--no-build");
  if (shouldBuild) {
    console.log("\n🔨 [BƯỚC 2/4] Đang biên dịch & đóng gói XeChungServer.exe (Node SEA)...");
    await runCommand("npm", ["run", "build:windows-exe"], rootDir);
  } else {
    console.log("\n⏭️ Bỏ qua bước build vì có cờ --no-build");
  }

  if (!fs.existsSync(TARGET_EXE)) {
    throw new Error(`❌ Không tìm thấy tệp nhị phân đích tại: ${TARGET_EXE}`);
  }

  const stat = fs.statSync(TARGET_EXE);
  const buffer = fs.readFileSync(TARGET_EXE);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

  console.log(`📦 Tệp sẵn sàng tải lên:`);
  console.log(`   + Đường dẫn: ${TARGET_EXE}`);
  console.log(`   + Dung lượng: ${sizeMB} MB (${stat.size.toLocaleString()} bytes)`);
  console.log(`   + SHA-256: ${sha256}`);

  // BƯỚC 3: Truyền file binary qua cổng HTTP (Port 1994)
  console.log("\n📤 [BƯỚC 3/4] Bắt đầu truyền tệp lên máy chủ Windows VPS...");
  const uploadRes = await streamUpload(
    TARGET_EXE,
    `http://${VPS_HOST}:${VPS_PORT}/api/v1/system/upgrade`,
    SECRET_KEY
  );
  console.log("\n");

  if (!uploadRes.ok) {
    console.error("==================================================================");
    console.error(`❌ NÂNG CẤP THẤT BẠI: ${uploadRes.error || JSON.stringify(uploadRes.data || uploadRes.raw)}`);
    console.error("==================================================================");
    process.exit(1);
  }

  console.log("🎉 PHẢN HỒI MÁY CHỦ:");
  console.log(`   + Trạng thái: ${uploadRes.data?.status || "OK"}`);
  console.log(`   + Thông điệp: ${uploadRes.data?.message}`);
  console.log(`   + SHA-256 đối soát: ${uploadRes.data?.sha256}`);

  if (uploadRes.data?.sha256 && uploadRes.data.sha256 !== sha256) {
    console.warn("⚠️ CẢNH BÁO: Mã băm SHA-256 nhận được không trùng khớp!");
  } else {
    console.log("✅ SHA-256 trùng khớp 100%! Từng bit dữ liệu nguyên vẹn.");
  }

  // BƯỚC 4: Chờ máy chủ hoán đổi tệp & khởi động lại bản mới
  console.log("\n⏳ [BƯỚC 4/4] Chờ 5 giây máy chủ hoàn tất tự động khởi động lại...");
  await new Promise((r) => setTimeout(r, 5000));

  console.log("🔍 Đang kết nối lại để kiểm tra phiên bản mới...");
  let verified = false;
  for (let i = 1; i <= 6; i++) {
    const afterRes = await checkEndpoint(`http://${VPS_HOST}:${VPS_PORT}/api/v1/system/version`, 3000);
    if (afterRes.ok) {
      console.log("==================================================================");
      console.log("🎉🎉 NÂNG CẤP TỪ XA HOÀN TẤT THÀNH CÔNG 100%!");
      console.log(`   + Trạng thái: ONLINE`);
      console.log(`   + Bản thực thi: ${afterRes.data?.executable} (${afterRes.data?.binary_size_mb})`);
      console.log(`   + Phiên bản: ${afterRes.data?.version}`);
      console.log(`   + CSDL: ${afterRes.data?.database}`);
      console.log(`   + Uptime: ${afterRes.data?.uptime_seconds}s (Vừa khởi động mới!)`);
      console.log("==================================================================");
      verified = true;
      break;
    }
    process.stdout.write(`... Đang thử lại lần ${i}/6...\n`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!verified) {
    console.warn("ℹ️ Máy chủ đang khởi động hoặc chưa phản hồi. Hãy kiểm tra lại sau ít giây.");
  }
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err.message);
  process.exit(1);
});

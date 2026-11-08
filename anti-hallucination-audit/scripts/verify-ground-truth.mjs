#!/usr/bin/env node

/**
 * 🛡️ verify-ground-truth.mjs
 * Công cụ tự động thẩm định sự thật & chống báo cáo láo (Độc quyền Trương Tổng)
 * Chạy: node verify-ground-truth.mjs [project_dir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const targetDir = path.resolve(process.argv[2] || process.cwd());
const projectName = path.basename(targetDir);

console.log('================================================================');
console.log(`🛡️ THẨM ĐỊNH SỰ THẬT & BẰNG CHỨNG VẬT LÝ: [${projectName}]`);
console.log(`📍 Thư mục: ${targetDir}`);
console.log('================================================================\n');

async function runCheck() {
  const report = {
    gitStatus: 'Chưa kiểm tra',
    distStatus: 'Không áp dụng',
    testStatus: 'Không có script test',
    simulatorStatus: 'Chưa kiểm tra',
    portsStatus: 'Sạch',
    verdict: 'CHƯA KẾT LUẬN',
  };

  // 1. Kiểm tra Git
  try {
    const { stdout: gitOut } = await execAsync('git status -s', { cwd: targetDir });
    const lines = gitOut.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      report.gitStatus = '✅ Sạch (Đã commit toàn bộ hoặc không có diff dở dang)';
    } else {
      report.gitStatus = `⚠️ Có ${lines.length} file thay đổi chưa commit:\n   ` + lines.slice(0, 5).join('\n   ');
    }
  } catch {
    report.gitStatus = '⚠️ Thư mục chưa khởi tạo Git repository!';
  }

  // 2. Kiểm tra dist vs src (Chống Ghost Code)
  const srcDir = path.join(targetDir, 'src');
  const distDir = path.join(targetDir, 'dist');
  if (fs.existsSync(srcDir) && fs.existsSync(distDir)) {
    try {
      const getLatestMtime = (dir) => {
        let max = 0;
        const walk = (d) => {
          for (const item of fs.readdirSync(d)) {
            const p = path.join(d, item);
            const st = fs.statSync(p);
            if (st.isDirectory() && !item.includes('node_modules')) walk(p);
            else if (st.isFile() && st.mtimeMs > max) max = st.mtimeMs;
          }
        };
        walk(dir);
        return max;
      };

      const srcTime = getLatestMtime(srcDir);
      const distTime = getLatestMtime(distDir);
      if (srcTime > distTime) {
        report.distStatus = '❌ CẢNH BÁO: Code trong src/ mới hơn dist/! (Chưa chạy `npm run build`, máy vẫn đang chạy code cũ)';
      } else {
        report.distStatus = '✅ Hợp lệ: dist/ đã được biên dịch mới nhất sau src/';
      }
    } catch (e) {
      report.distStatus = `Lỗi kiểm tra dist: ${e.message}`;
    }
  }

  // 3. Kiểm tra bài test / typecheck
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts?.test) {
        try {
          await execAsync('npm test', { cwd: targetDir, timeout: 30000 });
          report.testStatus = '✅ npm test: PASS 100%';
        } catch (e) {
          report.testStatus = `❌ npm test: FAILED (${e.message.split('\n')[0]})`;
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Kiểm tra iOS Simulator
  try {
    const { stdout: simOut } = await execAsync('xcrun simctl list devices | grep -i booted || true');
    if (simOut.trim()) {
      report.simulatorStatus = `✅ Đang mở máy ảo: ${simOut.trim().split('\n')[0].trim()}`;
    } else {
      report.simulatorStatus = '⚠️ Không có iOS Simulator nào đang Booted';
    }
  } catch {
    report.simulatorStatus = 'Không thể chạy xcrun simctl';
  }

  // 5. Kiểm tra cổng mạng chống nhầm hnextgen
  try {
    const { stdout: lsofOut } = await execAsync('lsof -i :8080 -i :3000 -i :4200 -i :5173 -i :8081 || true');
    if (lsofOut.includes('8080') && lsofOut.includes('hsoft')) {
      report.portsStatus = '⚠️ CẢNH BÁO: Cổng 8080 đang chạy hsoft-ser (BV Thái Nguyên). CẤM nhận ảnh cổng này!';
    } else {
      report.portsStatus = '✅ Cổng mạng bình thường';
    }
  } catch {
    // ignore
  }

  console.log(`1. Trạng thái Git:        ${report.gitStatus}`);
  console.log(`2. Trạng thái Build dist: ${report.distStatus}`);
  console.log(`3. Trạng thái Test:       ${report.testStatus}`);
  console.log(`4. iOS Simulator:         ${report.simulatorStatus}`);
  console.log(`5. Rà soát Cổng mạng:     ${report.portsStatus}`);
  console.log('\n================================================================');
  console.log('🏁 KẾT LUẬN: ĐỐI CHIẾU HOÀN TẤT THEO QUY TẮC TRƯƠNG TỔNG!');
  console.log('================================================================');
}

runCheck();

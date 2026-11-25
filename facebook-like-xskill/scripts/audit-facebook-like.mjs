#!/usr/bin/env node

/**
 * 🛡️ audit-facebook-like.mjs
 * Công cụ kiểm toán kiến trúc Facebook-like (Zero-Store-Update & Zero-Secret Client)
 *
 * Cách dùng:
 *   1. Kiểm toán dự án: node audit-facebook-like.mjs [project_dir] [--check-diff] [--strict]
 *   2. Antigravity PreToolUse Hook: node audit-facebook-like.mjs --hook-stdin
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);

if (args.includes('--hook-stdin')) {
  runPreToolUseHook();
} else {
  const targetArg = args.find((a) => !a.startsWith('--'));
  const targetDir = path.resolve(targetArg || process.cwd());
  const checkDiff = args.includes('--check-diff');
  const strict = args.includes('--strict');
  runProjectAudit(targetDir, { checkDiff, strict });
}

function runPreToolUseHook() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const toolName = String(payload?.toolCall?.name || '').toLowerCase();
  const toolArgs = payload?.toolCall?.args || {};

  const nativePathPattern = /(^|\/)(ios|android|plugins)(\/|$)|Info\.plist$|AndroidManifest\.xml$|Expo\.plist$|app\.config\.(js|ts|json)$|app\.json$|(^|\/)package\.json$/i;

  if (toolName === 'write_file' || toolName === 'edit_file') {
    const filePath = String(toolArgs.Path || toolArgs.path || '');
    if (nativePathPattern.test(filePath)) {
      process.stdout.write(
        JSON.stringify({
          decision: 'ask',
          reason: `🛑 NATIVE SHELL FREEZE GUARD: File "${path.basename(filePath)}" thuộc vùng Native Shell / Config. Sửa đổi có thể buộc build lại IPA/AAB nộp Store. Xác nhận nếu bạn chấp nhận thay đổi Native ABI!`,
        })
      );
      return;
    }
  }

  if (toolName === 'run_command') {
    const cmd = String(toolArgs.CommandLine || toolArgs.commandLine || '');
    if (/\b(npm\s+(install|i)|npx\s+expo\s+install|yarn\s+add|pnpm\s+add|pod\s+install|expo\s+prebuild)\b/i.test(cmd)) {
      process.stdout.write(
        JSON.stringify({
          decision: 'ask',
          reason: `🛑 NATIVE SHELL FREEZE GUARD: Lệnh "${cmd.slice(0, 80)}" có thể thay đổi dependency Native và phá vỡ tính năng chỉ-update-server (OTA). Hãy xác nhận nếu package là pure-JS hoặc chấp nhận nộp lại Store!`,
        })
      );
      return;
    }
  }

  process.stdout.write(JSON.stringify({ decision: 'allow' }));
}

function walkFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, extensions));
    } else if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function runProjectAudit(targetDir, { checkDiff, strict }) {
  console.log('==================================================================');
  console.log(`🛡️  FACEBOOK-LIKE ARCHITECTURE AUDIT: [${path.basename(targetDir)}]`);
  console.log(`📍 Thư mục: ${targetDir}`);
  console.log('==================================================================\n');

  let failures = 0;
  let warnings = 0;

  const logItem = (status, title, detail = '') => {
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} [${status}] ${title}`);
    if (detail) console.log(`   ${detail}`);
    if (status === 'FAIL') failures++;
    if (status === 'WARN') warnings++;
  };

  // 1. NATIVE SHELL DIFF AUDIT
  if (checkDiff) {
    try {
      const gitOut = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8' });
      const changedFiles = gitOut
        .split('\n')
        .map((line) => line.slice(3).trim())
        .filter(Boolean);
      const nativeTouched = changedFiles.filter((f) =>
        /^(ios|android|plugins)\//i.test(f) || /^(app\.config\.|app\.json$|package\.json$)/i.test(f)
      );
      if (nativeTouched.length > 0) {
        logItem(
          'FAIL',
          `Phát hiện ${nativeTouched.length} file vùng Native/Config bị chạm:`,
          `${nativeTouched.slice(0, 8).join(', ')} -> Có nguy cơ buộc nộp lại Store!`
        );
      } else {
        logItem('PASS', 'Native ABI Clean: Không có file ios/, android/, hay config native nào bị sửa.');
      }
    } catch {
      logItem('WARN', 'Bỏ qua Native Diff Audit (không tìm thấy Git repo).');
    }
  }

  // 2. OTA READINESS AUDIT
  const pkgPath = path.join(targetDir, 'package.json');
  const appConfigPath = fs.existsSync(path.join(targetDir, 'app.config.js'))
    ? path.join(targetDir, 'app.config.js')
    : fs.existsSync(path.join(targetDir, 'app.config.ts'))
    ? path.join(targetDir, 'app.config.ts')
    : path.join(targetDir, 'app.json');

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(readSafe(pkgPath) || '{}');
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps['expo-updates']) {
      logItem('PASS', `Đã cài expo-updates (${deps['expo-updates']}).`);
    } else {
      logItem('FAIL', 'Chưa cài expo-updates trong package.json (chưa hỗ trợ cập nhật JS Bundle OTA tự host).');
    }
  }

  const appConfigText = readSafe(appConfigPath);
  if (appConfigText) {
    const hasCustomUrl = /updates\s*:\s*\{[\s\S]*url\s*:/.test(appConfigText) || /"url"\s*:\s*"https?:\/\//.test(appConfigText);
    const hasCodeSign = /codeSigningCertificate/.test(appConfigText);
    if (hasCustomUrl) {
      logItem('PASS', `Đã cấu hình updates.url trong ${path.basename(appConfigPath)}.`);
    } else {
      logItem('FAIL', `Thiếu updates.url (self-hosted OTA endpoint) trong ${path.basename(appConfigPath)}.`);
    }
    if (hasCodeSign) {
      logItem('PASS', 'Đã bật codeSigningCertificate (RSA Code Signing cho OTA).');
    } else {
      logItem('WARN', 'Chưa bật updates.codeSigningCertificate — khuyến nghị ký số RSA-2048 cho bản OTA.');
    }
  }

  const expoPlistFiles = walkFiles(path.join(targetDir, 'ios'), ['.plist']).filter((p) => p.endsWith('Expo.plist'));
  for (const plist of expoPlistFiles) {
    const txt = readSafe(plist);
    if (/<key>EXUpdatesEnabled<\/key>\s*<true\s*\/>/i.test(txt)) {
      logItem('PASS', `iOS ${path.relative(targetDir, plist)}: EXUpdatesEnabled = true.`);
    } else {
      logItem('FAIL', `iOS ${path.relative(targetDir, plist)}: EXUpdatesEnabled đang tắt (false) -> App iOS không tải được OTA!`);
    }
  }

  const androidManifest = path.join(targetDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(androidManifest)) {
    const txt = readSafe(androidManifest);
    if (/expo\.modules\.updates\.ENABLED"[^>]*android:value="true"/i.test(txt)) {
      logItem('PASS', 'Android AndroidManifest.xml: expo.modules.updates.ENABLED = true.');
    } else {
      logItem('FAIL', 'Android AndroidManifest.xml: expo.modules.updates.ENABLED đang là false -> App Android không tải được OTA!');
    }
  }

  // 3. ZERO-SECRET & CLIENT MATH AUDIT
  const srcDir = path.join(targetDir, 'src');
  const srcFiles = walkFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
  const findings = {
    dynamicEval: [],
    vendorCallsOrKeys: [],
    clientMath: [],
  };

  for (const file of srcFiles) {
    const rel = path.relative(targetDir, file);
    const content = readSafe(file);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }
      const ln = idx + 1;
      if (/\b(eval|Function)\s*\(/.test(line)) {
        findings.dynamicEval.push(`${rel}:${ln}`);
      }
      if (
        /(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{30,}|rsapi\.goong\.io|maps\.googleapis\.com|api\.openai\.com|goongjs\.accessToken\s*=)/.test(
          line
        )
      ) {
        findings.vendorCallsOrKeys.push(`${rel}:${ln}`);
      }
      if (/function\s+calculate(OrderSettlement|MatchScore|Fee|Commission|Pricing)\b/.test(line)) {
        findings.clientMath.push(`${rel}:${ln}`);
      }
    });
  }

  if (findings.dynamicEval.length === 0) {
    logItem('PASS', 'An toàn thực thi: Không phát hiện eval() hoặc new Function() trong src/.');
  } else {
    logItem('FAIL', 'Phát hiện eval()/new Function() trong src/ (nguy cơ RCE & vi phạm Apple 2.5.2):', findings.dynamicEval.join(', '));
  }

  if (findings.vendorCallsOrKeys.length === 0) {
    logItem('PASS', 'Zero Vendor Secret Leak: Không phát hiện key Goong/Google/OpenAI hay direct vendor API trong src/.');
  } else {
    logItem(
      'WARN',
      `Phát hiện ${findings.vendorCallsOrKeys.length} điểm lộ key/gọi trực tiếp vendor API từ client (nên proxy qua Backend):`,
      findings.vendorCallsOrKeys.join(', ')
    );
  }

  if (findings.clientMath.length === 0) {
    logItem('PASS', 'Zero Client Pricing/Matching Math: Không có hàm tính đối soát/matching chạy ở client.');
  } else {
    logItem(
      'WARN',
      `Phát hiện ${findings.clientMath.length} hàm tính nghiệp vụ vẫn còn ở src/ (cần chuyển 100% về Backend):`,
      findings.clientMath.join(', ')
    );
  }

  // 4. PROJECT RULE LOCK CHECK
  const hasRule =
    fs.existsSync(path.join(targetDir, '.agents', 'rules', 'facebook-like.md')) ||
    fs.existsSync(path.join(targetDir, '.agents', 'rules', 'FACEBOOK_LIKE_PROJECT_RULE.md')) ||
    /FACEBOOK-LIKE|NATIVE SHELL FREEZE/i.test(readSafe(path.join(targetDir, 'AGENTS.md')));

  if (hasRule) {
    logItem('PASS', 'Project Rule Guard đã được cài trong AGENTS.md hoặc .agents/rules/.');
  } else {
    logItem('WARN', 'Chưa cài FACEBOOK_LIKE_PROJECT_RULE.md vào AGENTS.md hoặc .agents/rules/ -> AI session sau dễ quên!');
  }

  console.log('\n==================================================================');
  console.log(`🏁 KẾT QUẢ AUDIT: ${failures} FAIL | ${warnings} WARN`);
  console.log('==================================================================');

  if (failures > 0 || (strict && warnings > 0)) {
    process.exit(1);
  }
}

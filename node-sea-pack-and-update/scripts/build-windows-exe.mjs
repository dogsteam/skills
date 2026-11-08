import { access, cp, mkdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;
const backendDir = join(root, "backend");
const backendExe = join(backendDir, "dist", "windows", "XeChungServer.exe");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const releaseVersion = process.env.RELEASE_VERSION?.trim() || packageJson.version;
const releaseDir = join(root, "dist", "windows", `XeChungServer-${releaseVersion}`);
const releaseExe = join(releaseDir, "XeChungServer.exe");
const releaseEnv = join(releaseDir, "XeChungServer.env");
const releaseEnvExample = join(releaseDir, "XeChungServer.env.example");
const rootEnvExample = join(backendDir, "XeChungServer.env.example");

async function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = await execFileAsync(command, args, { cwd, maxBuffer: 32 * 1024 * 1024 });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.warn(result.stderr.trim());
}

console.log("🔨 Đang đóng gói XeChungServer.exe trong backend...");
await run("npm", ["run", "build:windows-exe"], backendDir);

await mkdir(releaseDir, { recursive: true });
await cp(backendExe, releaseExe);
await cp(rootEnvExample, releaseEnv);
await cp(rootEnvExample, releaseEnvExample);

console.log("==================================================");
console.log(`🎉 HOÀN TẤT ĐÓNG GÓI XE CHUNG SERVER:`);
console.log(`📁 Đường dẫn: ${releaseExe}`);
console.log(`⚙️ File cấu hình mẫu: ${releaseEnv}`);
console.log(`👉 Chỉ cần copy thư mục ${releaseDir} lên VPS Windows là chạy được ngay!`);
console.log("==================================================");

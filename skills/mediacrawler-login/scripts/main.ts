#!/usr/bin/env bun
/**
 * MediaCrawler 登录助手
 * 启动本地 HTTP 服务，打开浏览器登录 MediaCrawler WebUI，
 * 自动获取 session → 创建 API Key → 写入所有 skill 的 EXTEND.md
 */

import http from "http";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execAsync = promisify(exec);

// ── 配置 ────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "http://113.44.56.214:8080";
const CALLBACK_PORT = 19527;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}`;

const SKILL_NAMES = [
  "mediacrawler-crawl-task",
  "mediacrawler-health-check",
  "mediacrawler-data-export",
  "mediacrawler-account-manage",
];

// ── 参数解析 ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const baseUrlIdx = args.indexOf("--base-url");
  const baseUrl = baseUrlIdx >= 0 ? args[baseUrlIdx + 1] : DEFAULT_BASE_URL;
  const keyName = args[args.indexOf("--key-name") + 1] || "cursor-skill-key";
  const expireDays = parseInt(args[args.indexOf("--expire-days") + 1] || "365");
  return { baseUrl: baseUrl.replace(/\/$/, ""), keyName, expireDays };
}

// ── EXTEND.md 路径 ───────────────────────────────────────────────────────────

function getExtendPaths(skillName: string): string[] {
  const home = os.homedir();
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return [
    path.join(xdgConfig, "baoyu-skills", skillName, "EXTEND.md"),
    path.join(home, ".baoyu-skills", skillName, "EXTEND.md"),
  ];
}

function findExistingExtend(skillName: string): string | null {
  for (const p of getExtendPaths(skillName)) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function buildExtendContent(baseUrl: string, apiKey: string, existing: string | null): string {
  if (existing) {
    const content = fs.readFileSync(existing, "utf-8");
    // 替换或追加 BASE_URL / API_KEY
    let updated = content
      .replace(/^BASE_URL=.*/m, `BASE_URL=${baseUrl}`)
      .replace(/^API_KEY=.*/m, `API_KEY=${apiKey}`);
    if (!/^BASE_URL=/m.test(updated)) updated += `\nBASE_URL=${baseUrl}`;
    if (!/^API_KEY=/m.test(updated)) updated += `\nAPI_KEY=${apiKey}`;
    return updated;
  }
  return `# MediaCrawler 配置\n\n## API 连接\nBASE_URL=${baseUrl}\nAPI_KEY=${apiKey}\n\n## 默认配置（可选）\n# DEFAULT_PLATFORM=xhs\n# DEFAULT_CRAWLER_TYPE=search\n`;
}

function writeExtendFiles(baseUrl: string, apiKey: string): string[] {
  const written: string[] = [];
  for (const skillName of SKILL_NAMES) {
    const existing = findExistingExtend(skillName);
    // 写到 XDG config 目录（首选），若已有文件则原地更新
    const targetPath = existing || getExtendPaths(skillName)[0];
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buildExtendContent(baseUrl, apiKey, existing), "utf-8");
    written.push(targetPath);
  }
  return written;
}

// ── 打开浏览器 ───────────────────────────────────────────────────────────────

async function openBrowser(url: string) {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      await execAsync(`open "${url}"`);
    } else if (platform === "win32") {
      await execAsync(`start "" "${url}"`);
    } else {
      await execAsync(`xdg-open "${url}"`);
    }
  } catch {
    console.log(`\n请手动打开浏览器访问：${url}\n`);
  }
}

// ── API 调用 ─────────────────────────────────────────────────────────────────

async function createApiKey(baseUrl: string, sessionId: string, keyName: string, expireDays: number): Promise<string> {
  const res = await fetch(`${baseUrl}/api/api-keys/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({
      name: keyName,
      scopes: ["tasks:read", "tasks:write", "data:read", "accounts:read"],
      expire_days: expireDays,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`创建 API Key 失败 (${res.status}): ${text}`);
  }
  const data = await res.json() as { api_key: string };
  return data.api_key;
}

// ── 本地回调服务 ─────────────────────────────────────────────────────────────

const SUCCESS_HTML = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">
<title>登录成功</title>
<style>
  body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f0fdf4; }
  .card { background:#fff; border-radius:12px; padding:40px 48px; box-shadow:0 4px 24px rgba(0,0,0,.08); text-align:center; max-width:420px; }
  .icon { font-size:56px; margin-bottom:16px; }
  h1 { color:#16a34a; margin:0 0 12px; font-size:22px; }
  p { color:#6b7280; margin:0; line-height:1.6; }
  .key { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; font-family:monospace; font-size:13px; color:#374151; margin-top:20px; word-break:break-all; text-align:left; }
</style></head><body>
<div class="card">
  <div class="icon">✅</div>
  <h1>登录成功！</h1>
  <p>API Key 已自动生成并写入本地配置文件，<br>可以关闭此页面了。</p>
  <div class="key" id="key">正在获取...</div>
</div>
<script>
  const p = new URLSearchParams(location.search);
  const k = p.get("key") || "";
  document.getElementById("key").textContent = k ? "API Key: " + k.slice(0,12) + "..." : "已写入配置";
</script>
</body></html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">
<title>登录失败</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fef2f2;}
.card{background:#fff;border-radius:12px;padding:40px 48px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:420px;}
h1{color:#dc2626;margin:0 0 12px;font-size:22px;}.msg{color:#6b7280;font-size:14px;background:#fef2f2;padding:12px;border-radius:8px;margin-top:16px;word-break:break-all;}</style>
</head><body><div class="card"><div style="font-size:56px">❌</div><h1>出错了</h1><div class="msg">${msg}</div></div></body></html>`;

function startCallbackServer(baseUrl: string, keyName: string, expireDays: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, CALLBACK_URL);

      // 登录页转发
      if (url.pathname === "/") {
        res.writeHead(302, { Location: `${baseUrl}/#/login?callback=${encodeURIComponent(CALLBACK_URL + "/callback")}` });
        res.end();
        return;
      }

      if (url.pathname !== "/callback") {
        res.writeHead(404); res.end("Not found"); return;
      }

      const sessionId = url.searchParams.get("session_id");
      if (!sessionId) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(ERROR_HTML("未收到 session_id，请确认已成功登录后重试。"));
        return;
      }

      try {
        console.log("\n✅ 收到登录回调，正在创建 API Key...");
        const apiKey = await createApiKey(baseUrl, sessionId, keyName, expireDays);
        const written = writeExtendFiles(baseUrl, apiKey);

        console.log(`\n🔑 API Key 生成成功：${apiKey.slice(0, 12)}...`);
        console.log(`\n📝 已写入以下配置文件：`);
        written.forEach(p => console.log(`   ${p}`));
        console.log("\n✨ 配置完成，所有 skill 现在可以使用了！\n");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(SUCCESS_HTML.replace("正在获取...", `API Key: ${apiKey.slice(0, 12)}...`));

        server.close();
        resolve();
      } catch (err: any) {
        console.error(`\n❌ 错误：${err.message}`);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(ERROR_HTML(String(err.message)));
        server.close();
        reject(err);
      }
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ 端口 ${CALLBACK_PORT} 已被占用，请关闭占用进程后重试。`);
      }
      reject(err);
    });

    server.listen(CALLBACK_PORT, "127.0.0.1", async () => {
      console.log(`\n🚀 登录服务已启动 (端口 ${CALLBACK_PORT})`);
      console.log(`\n📌 MediaCrawler 地址：${baseUrl}`);
      console.log(`\n🌐 正在打开浏览器...`);

      // 直接打开 MediaCrawler 登录页，登录成功后需手动触发回调
      const loginUrl = `${baseUrl}`;
      await openBrowser(loginUrl);

      console.log(`\n👉 请在浏览器中完成登录后，运行以下命令获取 session_id 并回调：`);
      console.log(`\n   bash ${path.join(path.dirname(import.meta.url.replace("file://", "")), "get-session.sh")} ${baseUrl} ${CALLBACK_PORT}`);
      console.log(`\n   或者直接访问：${CALLBACK_URL}/callback?session_id=YOUR_SESSION_ID\n`);
    });
  });
}

// ── 非回调模式：直接用用户名密码登录 ────────────────────────────────────────

async function loginWithPassword(baseUrl: string, username: string, password: string, keyName: string, expireDays: number) {
  console.log(`\n🔐 正在登录 ${baseUrl}...`);
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`登录失败 (${res.status}): ${text}`);
  }
  const data = await res.json() as { session_id: string; user: { username: string } };
  console.log(`✅ 登录成功，用户：${data.user.username}`);

  console.log(`\n🔑 正在创建 API Key "${keyName}"（有效期 ${expireDays} 天）...`);
  const apiKey = await createApiKey(baseUrl, data.session_id, keyName, expireDays);

  const written = writeExtendFiles(baseUrl, apiKey);
  console.log(`\n🔑 API Key：${apiKey}`);
  console.log(`\n📝 已写入以下配置文件：`);
  written.forEach(p => console.log(`   ${p}`));
  console.log("\n✨ 配置完成，所有 skill 现在可以使用了！\n");
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

async function main() {
  const { baseUrl, keyName, expireDays } = parseArgs();
  const args = process.argv.slice(2);

  const userIdx = args.indexOf("--username");
  const passIdx = args.indexOf("--password");

  if (userIdx >= 0 && passIdx >= 0) {
    // 直接密码登录模式
    const username = args[userIdx + 1];
    const password = args[passIdx + 1];
    await loginWithPassword(baseUrl, username, password, keyName, expireDays);
  } else {
    // 浏览器登录模式
    console.log("\n💡 提示：也可以用 --username 和 --password 直接登录，无需浏览器\n");
    await startCallbackServer(baseUrl, keyName, expireDays);
  }
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});

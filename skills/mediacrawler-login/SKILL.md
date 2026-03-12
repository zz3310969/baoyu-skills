---
name: mediacrawler-login
description: 登录 MediaCrawler WebUI 并自动生成 API Key 写入本地配置。支持密码直登和浏览器交互两种模式，一次运行后所有 mediacrawler-* skill 均可直接使用。当用户说"登录 MediaCrawler"、"配置 API Key"、"初始化爬虫配置"、"mc login"时使用。
---

# MediaCrawler 登录配置技能

登录 MediaCrawler WebUI，自动生成 `mc_` 前缀 API Key，写入所有 `mediacrawler-*` skill 的 EXTEND.md 配置文件。

## 使用方式

### 方式一：密码直登（推荐）

```bash
${BUN_X} ${SKILL_DIR}/scripts/main.ts \
  --username admin \
  --password admin123
```

**可选参数**：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--base-url` | `http://113.44.56.214:8080` | MediaCrawler 服务地址 |
| `--username` | — | 登录用户名 |
| `--password` | — | 登录密码 |
| `--key-name` | `cursor-skill-key` | API Key 名称 |
| `--expire-days` | `365` | API Key 有效期（天） |

**示例**：

```bash
# 使用默认服务器
${BUN_X} ${SKILL_DIR}/scripts/main.ts \
  --username admin --password admin123

# 自定义服务器地址
${BUN_X} ${SKILL_DIR}/scripts/main.ts \
  --base-url http://localhost:8080 \
  --username admin --password admin123 \
  --key-name my-key --expire-days 90
```

### 方式二：浏览器登录

不传用户名密码时，自动打开浏览器，配合辅助脚本完成登录：

```bash
# 终端一：启动本地回调服务
${BUN_X} ${SKILL_DIR}/scripts/main.ts --base-url http://113.44.56.214:8080

# 终端二：浏览器登录后执行
bash ${SKILL_DIR}/scripts/get-session.sh http://113.44.56.214:8080 19527
```

## 执行效果

运行成功后自动写入以下配置文件（每个 skill 各一份）：

```
~/.config/baoyu-skills/mediacrawler-crawl-task/EXTEND.md
~/.config/baoyu-skills/mediacrawler-health-check/EXTEND.md
~/.config/baoyu-skills/mediacrawler-data-export/EXTEND.md
~/.config/baoyu-skills/mediacrawler-account-manage/EXTEND.md
```

每个 EXTEND.md 内容格式：

```markdown
# MediaCrawler 配置

## API 连接
BASE_URL=http://113.44.56.214:8080
API_KEY=mc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

## 默认配置（可选）
# DEFAULT_PLATFORM=xhs
# DEFAULT_CRAWLER_TYPE=search
```

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/main.ts`
3. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun
4. Replace all `${SKILL_DIR}` and `${BUN_X}` in this document with actual values

**Script Reference**:

| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | 主入口：密码登录或启动浏览器回调服务 |
| `scripts/get-session.sh` | 辅助脚本：在终端交互式输入账号密码完成回调 |

## 认证原理

```
用户 → login (POST /api/auth/login)
     ← session_id
     → 创建 API Key (POST /api/api-keys/)
       X-Session-ID: {session_id}
     ← mc_xxxx（API Key）
     → 写入 EXTEND.md
```

后续所有 mediacrawler-* skill 调用 API 时使用：

```
Authorization: Bearer mc_xxxx
```

## Extension Support

Custom configurations via EXTEND.md. See **使用方式** section for paths and supported options.

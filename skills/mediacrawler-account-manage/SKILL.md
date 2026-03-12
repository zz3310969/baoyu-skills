---
name: mediacrawler-account-manage
description: 管理 MediaCrawler 平台账号，包括查看账号状态、更新 Cookie、验证账号有效性、添加/删除账号。当用户说"更新Cookie"、"账号失效"、"添加账号"、"管理账号"、"account cookie"时使用。需要配置 API 地址和 API Key（见 EXTEND.md）。
---

# MediaCrawler 账号管理技能

查看和管理 MediaCrawler 中各平台的爬取账号，重点处理 Cookie 更新和有效性验证。

## Preferences (EXTEND.md)

检查 EXTEND.md 存在顺序：

```bash
# macOS / Linux
test -f .baoyu-skills/mediacrawler-account-manage/EXTEND.md && echo "project"
test -f "${XDG_CONFIG_HOME:-$HOME/.config}/baoyu-skills/mediacrawler-account-manage/EXTEND.md" && echo "xdg"
test -f "$HOME/.baoyu-skills/mediacrawler-account-manage/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────────────────────────┬──────────────────────────┐
│                              Path                                    │         Location         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ .baoyu-skills/mediacrawler-account-manage/EXTEND.md                  │ Project directory        │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $XDG_CONFIG_HOME/baoyu-skills/mediacrawler-account-manage/EXTEND.md  │ XDG config (~/.config)   │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $HOME/.baoyu-skills/mediacrawler-account-manage/EXTEND.md            │ User home                │
└──────────────────────────────────────────────────────────────────────┴──────────────────────────┘

**EXTEND.md 模板**：

```markdown
# MediaCrawler 配置

## API 连接
BASE_URL=http://113.44.56.214:8080
API_KEY=your-api-key-here
```

**EXTEND.md 支持的字段**：
- `BASE_URL`：MediaCrawler API 地址（必填）
- `API_KEY`：API 认证密钥（必填）

---

## 支持的操作

| 操作 | 说明 |
|------|------|
| 查看账号列表 | 显示所有平台账号及状态 |
| 更新 Cookie | 替换指定账号的 Cookie |
| 验证账号有效性 | 检测 Cookie 是否仍然有效 |
| 添加新账号 | 创建新的平台账号记录 |
| 删除账号 | 移除指定账号 |
| 启用/禁用账号 | 切换账号的可用状态 |

---

## 工作流

### Step 1：加载配置

读取 EXTEND.md 获取 `BASE_URL` 和 `API_KEY`。

### Step 2：理解用户意图

根据用户输入判断操作类型：
- "查看账号" / "账号列表" → 列出所有账号
- "更新Cookie" / "Cookie失效" → 更新 Cookie 流程
- "添加账号" → 添加新账号
- "删除账号" → 删除指定账号

### Step 3：执行操作

**3.1 查看账号列表**：

```bash
curl -s "${BASE_URL}/api/accounts?page=1&page_size=100" \
  -H "X-API-Key: ${API_KEY}"
```

输出格式：
```
账号列表（共 5 个）

小红书（xhs）
  ✅ user_xhs_001  昵称：小红花  状态：正常  最后使用：2025-03-10
  ⚠️  user_xhs_002  昵称：未知   状态：Cookie 过期

抖音（dy）
  ✅ user_dy_001   昵称：抖音用户  状态：正常
```

**3.2 更新 Cookie**：

首先询问用户：
1. 目标账号（平台 + 账号ID或昵称）
2. 新的 Cookie 字符串（提示用户从浏览器开发者工具获取）

获取 Cookie 指引（根据平台给出对应步骤）：

| 平台 | 获取方式 |
|------|---------|
| 小红书 | Chrome DevTools → Network → 任意请求 → Request Headers → cookie |
| 抖音 | Chrome DevTools → Application → Cookies → `https://www.douyin.com` |
| 微博 | Chrome DevTools → Network → 任意请求 → Request Headers → Cookie |
| 快手 | Chrome DevTools → Application → Cookies → `https://www.kuaishou.com` |

用户提供 Cookie 后，调用更新接口：

```bash
curl -s -X PUT "${BASE_URL}/api/accounts/{account_id}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "cookies": "{new_cookie_string}"
  }'
```

**3.3 验证账号有效性**：

```bash
curl -s -X POST "${BASE_URL}/api/accounts/{account_id}/verify" \
  -H "X-API-Key: ${API_KEY}"
```

返回结果：
- `valid: true` → ✅ Cookie 有效
- `valid: false` → ❌ Cookie 已失效，需要更新

**3.4 添加新账号**：

```bash
curl -s -X POST "${BASE_URL}/api/accounts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "platform": "{platform}",
    "account_id": "{unique_id}",
    "nickname": "{nickname}",
    "cookies": "{cookie_string}",
    "login_type": "cookie"
  }'
```

**3.5 删除账号**：

```bash
curl -s -X DELETE "${BASE_URL}/api/accounts/{account_id}" \
  -H "X-API-Key: ${API_KEY}"
```

**3.6 启用/禁用账号**：

```bash
curl -s -X PUT "${BASE_URL}/api/accounts/{account_id}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{"status": "active"}'  # 或 "disabled"
```

### Step 4：输出操作结果

操作完成后给出明确反馈：

```
✅ Cookie 更新成功

账号：user_xhs_001（小红书）
状态：已更新
验证：Cookie 有效，账号可正常使用

下一步：可以创建爬取任务了（使用 mediacrawler-crawl-task）
```

---

## 安全注意事项

- Cookie 是敏感信息，不要在对话记录中明文展示完整 Cookie
- 显示时截断：只显示前 20 个字符 + `...`
- 建议用户定期轮换 Cookie（每2-4周）

## Extension Support

自定义配置通过 EXTEND.md 管理。参见上方 **Preferences** 部分了解路径和支持的字段。

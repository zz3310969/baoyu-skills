---
name: mediacrawler-health-check
description: 检查远程 MediaCrawler 服务的健康状态，包括 API 可用性、数据库连接、代理池、账号状态等。当用户说"检查服务状态"、"health check"、"服务是否正常"、"检查MediaCrawler"时使用。需要配置 API 地址和 API Key（见 EXTEND.md）。
---

# MediaCrawler 健康检查技能

全面检查 MediaCrawler 服务各组件的运行状态，并给出修复建议。

## Preferences (EXTEND.md)

检查 EXTEND.md 存在顺序：

```bash
# macOS / Linux
test -f .baoyu-skills/mediacrawler-health-check/EXTEND.md && echo "project"
test -f "${XDG_CONFIG_HOME:-$HOME/.config}/baoyu-skills/mediacrawler-health-check/EXTEND.md" && echo "xdg"
test -f "$HOME/.baoyu-skills/mediacrawler-health-check/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────────────────────────┬──────────────────────────┐
│                              Path                                    │         Location         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ .baoyu-skills/mediacrawler-health-check/EXTEND.md                    │ Project directory        │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $XDG_CONFIG_HOME/baoyu-skills/mediacrawler-health-check/EXTEND.md    │ XDG config (~/.config)   │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $HOME/.baoyu-skills/mediacrawler-health-check/EXTEND.md              │ User home                │
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

## 检查项目

| 检查项 | API 端点 | 重要性 |
|--------|---------|--------|
| API 服务可达性 | `GET /api/health` | 🔴 关键 |
| 数据库连接 | `GET /api/system/db-status` | 🔴 关键 |
| 任务队列状态 | `GET /api/tasks/stats` | 🟡 重要 |
| 账号池状态 | `GET /api/accounts/stats` | 🟡 重要 |
| 代理池状态 | `GET /api/proxies/stats` | 🟢 一般 |
| 磁盘使用情况 | `GET /api/system/disk` | 🟢 一般 |

---

## 工作流

### Step 1：加载配置

读取 EXTEND.md 获取 `BASE_URL` 和 `API_KEY`。

### Step 2：逐项执行健康检查

**2.1 检查 API 服务**：

```bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BASE_URL}/api/health")
```

- 返回 200 → ✅ 正常
- 连接超时/拒绝 → 🔴 服务不可达，停止后续检查

**2.2 检查数据库**：

```bash
curl -s "${BASE_URL}/api/system/db-status" -H "X-API-Key: ${API_KEY}"
```

**2.3 检查任务队列**：

```bash
curl -s "${BASE_URL}/api/tasks/stats" -H "X-API-Key: ${API_KEY}"
```

关注：
- `running` 数量（是否有任务卡死）
- `failed` 数量（近期失败率）
- `pending` 数量（队列积压）

**2.4 检查账号池**：

```bash
curl -s "${BASE_URL}/api/accounts?page=1&page_size=100" -H "X-API-Key: ${API_KEY}"
```

统计各平台有效账号数量，Cookie 失效的账号标记为警告。

**2.5 检查代理池**：

```bash
curl -s "${BASE_URL}/api/proxies/stats" -H "X-API-Key: ${API_KEY}"
```

**2.6 检查系统资源**：

```bash
curl -s "${BASE_URL}/api/system/disk" -H "X-API-Key: ${API_KEY}"
```

磁盘使用超过 80% 发出警告。

### Step 3：输出诊断报告

```
🏥 MediaCrawler 健康检查报告
时间：2025-03-12 14:30:22
服务：http://113.44.56.214:8080

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
核心服务
  ✅ API 服务        响应时间: 45ms
  ✅ 数据库连接      MySQL 正常

任务状态
  ✅ 运行中: 2 个
  ✅ 排队中: 0 个
  ⚠️  近期失败: 3 个（请检查失败原因）

账号池
  ✅ 小红书: 2 个有效账号
  ⚠️  抖音: Cookie 已过期（1/2 个账号）
  ✅ 微博: 1 个有效账号

代理池
  ✅ 可用代理: 15 个

系统资源
  ✅ 磁盘使用: 45% (4.5GB / 10GB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总体状态：⚠️  有警告

建议操作：
  1. 更新抖音账号 Cookie（可用 mediacrawler-account-manage 技能）
  2. 检查 3 个失败任务的错误信息
```

### Step 4：给出修复建议

根据检查结果，主动给出对应修复命令或操作指引：

| 问题 | 建议 |
|------|------|
| API 不可达 | 检查 VPS 网络；使用 `mediacrawler-deploy` 重启服务 |
| 数据库连接失败 | SSH 登录检查 MySQL 状态 |
| Cookie 过期 | 使用 `mediacrawler-account-manage` 更新 Cookie |
| 磁盘快满 | 清理旧数据文件或扩容 |
| 队列积压 | 检查是否有任务卡死，考虑取消 |

## Extension Support

自定义配置通过 EXTEND.md 管理。参见上方 **Preferences** 部分了解路径和支持的字段。

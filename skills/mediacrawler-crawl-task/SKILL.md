---
name: mediacrawler-crawl-task
description: 通过 MediaCrawler REST API 创建和管理爬取任务。支持小红书、抖音、快手、B站、微博等平台的关键词搜索、创作者、详情爬取。当用户说"爬取"、"抓取"、"采集"、"搜索XX平台数据"、"crawl"时使用。需要配置 MediaCrawler API 地址和 API Key（见 EXTEND.md）。
---

# MediaCrawler 爬取任务技能

通过 MediaCrawler WebUI API 创建、监控和管理社交媒体爬取任务。

## Preferences (EXTEND.md)

**首次使用前必须配置**。检查 EXTEND.md 存在顺序：

```bash
# macOS / Linux
test -f .baoyu-skills/mediacrawler-crawl-task/EXTEND.md && echo "project"
test -f "${XDG_CONFIG_HOME:-$HOME/.config}/baoyu-skills/mediacrawler-crawl-task/EXTEND.md" && echo "xdg"
test -f "$HOME/.baoyu-skills/mediacrawler-crawl-task/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────────────────────────┬──────────────────────────┐
│                              Path                                    │         Location         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ .baoyu-skills/mediacrawler-crawl-task/EXTEND.md                      │ Project directory        │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $XDG_CONFIG_HOME/baoyu-skills/mediacrawler-crawl-task/EXTEND.md      │ XDG config (~/.config)   │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $HOME/.baoyu-skills/mediacrawler-crawl-task/EXTEND.md                │ User home                │
└──────────────────────────────────────────────────────────────────────┴──────────────────────────┘

┌───────────┬──────────────────────────────────────────────────────────────────┐
│  Result   │                            Action                               │
├───────────┼──────────────────────────────────────────────────────────────────┤
│ Found     │ 读取并解析配置                                                    │
├───────────┼──────────────────────────────────────────────────────────────────┤
│ Not found │ 提示用户创建配置文件（见下方模板）                                  │
└───────────┴──────────────────────────────────────────────────────────────────┘

**EXTEND.md 模板**：

```markdown
# MediaCrawler 配置

## API 连接
BASE_URL=http://113.44.56.214:8080
API_KEY=your-api-key-here

## 默认配置（可选）
DEFAULT_PLATFORM=xhs
DEFAULT_CRAWLER_TYPE=search
```

**EXTEND.md 支持的字段**：
- `BASE_URL`：MediaCrawler API 地址（必填）
- `API_KEY`：API 认证密钥（必填）
- `DEFAULT_PLATFORM`：默认平台，留空每次询问
- `DEFAULT_CRAWLER_TYPE`：默认爬取类型（search/detail/creator）

Schema 参考：`references/config/extend-schema.md`

---

## 支持的平台和爬取类型

| 平台代码 | 平台名称 | 支持的爬取类型 |
|---------|---------|--------------|
| `xhs` | 小红书 | search, detail, creator |
| `dy` | 抖音 | search, detail, creator |
| `ks` | 快手 | search, detail, creator |
| `bili` | B 站 | search, detail, creator |
| `wb` | 微博 | search, detail, creator |
| `tieba` | 贴吧 | search, detail |
| `zhihu` | 知乎 | search, detail |

## 爬取类型说明

| 类型 | 说明 | 必填参数 |
|------|------|---------|
| `search` | 关键词搜索 | `keywords` |
| `detail` | 指定帖子详情 | `note_ids` |
| `creator` | 创作者主页内容 | `creator_ids` |

---

## 工作流

### Step 1：加载配置

读取 EXTEND.md 获取 `BASE_URL` 和 `API_KEY`。若未找到配置文件，提示用户创建并停止。

### Step 2：理解用户需求

从用户输入中提取：
- **平台**：识别平台名称（"小红书"→`xhs`，"抖音"→`dy`，"B站"→`bili`，"微博"→`wb`）
- **爬取类型**：搜索词→`search`，帖子链接/ID→`detail`，用户主页→`creator`
- **关键词/ID**：提取具体目标
- **数量限制**：如"爬100条"→`max_count: 100`

若信息不足，询问用户。

### Step 3：创建爬取任务

```bash
curl -s -X POST "${BASE_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "task_name": "搜索 {keywords} - {platform}",
    "config": {
      "platform": "{platform}",
      "crawler_type": "{crawler_type}",
      "keywords": ["{keyword1}", "{keyword2}"],
      "login_type": "cookie",
      "max_count": 50,
      "enable_get_comments": false,
      "save_data_option": "db"
    }
  }'
```

记录返回的 `task_id`。

**创建 detail 任务示例**：
```bash
curl -s -X POST "${BASE_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "task_name": "详情爬取",
    "config": {
      "platform": "xhs",
      "crawler_type": "detail",
      "note_ids": ["id1", "id2"],
      "save_data_option": "db"
    }
  }'
```

### Step 4：监控任务进度

每 10 秒轮询一次，最长等待 30 分钟：

```bash
curl -s "${BASE_URL}/api/tasks/{task_id}" \
  -H "X-API-Key: ${API_KEY}"
```

**状态说明**：

| 状态 | 含义 | 动作 |
|------|------|------|
| `pending` | 排队中 | 继续等待 |
| `running` | 运行中 | 显示进度百分比 |
| `completed` | 完成 | 报告结果 |
| `failed` | 失败 | 显示错误信息 |
| `cancelled` | 已取消 | 停止轮询 |

**进度输出示例**：
```
⏳ 任务运行中... 45% (45/100)
   平台：小红书  类型：search  关键词：AI工具
```

### Step 5：报告结果

任务完成后输出摘要：

```
✅ 爬取完成

任务信息：
  平台：小红书（xhs）
  类型：关键词搜索
  关键词：AI工具, ChatGPT
  耗时：3分42秒

结果统计：
  帖子数：87 条
  评论数：0 条（未开启）

数据查询：可通过 mediacrawler-data-export 导出数据
```

---

## 常用操作

### 取消运行中的任务

```bash
curl -s -X POST "${BASE_URL}/api/tasks/{task_id}/cancel" \
  -H "X-API-Key: ${API_KEY}"
```

### 重试失败的任务

```bash
curl -s -X POST "${BASE_URL}/api/tasks/{task_id}/retry" \
  -H "X-API-Key: ${API_KEY}"
```

### 查看任务列表

```bash
curl -s "${BASE_URL}/api/tasks?page=1&page_size=10" \
  -H "X-API-Key: ${API_KEY}"
```

## Extension Support

自定义配置通过 EXTEND.md 管理。参见上方 **Preferences** 部分了解路径和支持的字段。

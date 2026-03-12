---
name: mediacrawler-data-export
description: 从 MediaCrawler 数据库查询和导出爬取数据。支持按平台、关键词、时间范围过滤，导出为 JSON/CSV 格式或生成统计摘要。当用户说"导出数据"、"查看爬取结果"、"数据统计"、"export data"时使用。需要配置 MediaCrawler API 地址和 API Key（见 EXTEND.md）。
---

# MediaCrawler 数据导出技能

查询、过滤和导出 MediaCrawler 已爬取的社交媒体数据。

## Preferences (EXTEND.md)

**首次使用前必须配置**。检查 EXTEND.md 存在顺序：

```bash
# macOS / Linux
test -f .baoyu-skills/mediacrawler-data-export/EXTEND.md && echo "project"
test -f "${XDG_CONFIG_HOME:-$HOME/.config}/baoyu-skills/mediacrawler-data-export/EXTEND.md" && echo "xdg"
test -f "$HOME/.baoyu-skills/mediacrawler-data-export/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────────────────────────┬──────────────────────────┐
│                              Path                                    │         Location         │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ .baoyu-skills/mediacrawler-data-export/EXTEND.md                     │ Project directory        │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $XDG_CONFIG_HOME/baoyu-skills/mediacrawler-data-export/EXTEND.md     │ XDG config (~/.config)   │
├──────────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ $HOME/.baoyu-skills/mediacrawler-data-export/EXTEND.md               │ User home                │
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
```

**EXTEND.md 支持的字段**：
- `BASE_URL`：MediaCrawler API 地址（必填）
- `API_KEY`：API 认证密钥（必填）

---

## 查询参数说明

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `platform` | string | 平台代码 | `xhs`, `dy`, `wb` |
| `keyword` | string | 关键词过滤 | `AI工具` |
| `start_date` | string | 开始日期 | `2025-01-01` |
| `end_date` | string | 结束日期 | `2025-03-12` |
| `page` | int | 页码（从1开始） | `1` |
| `page_size` | int | 每页数量（最大100） | `50` |

---

## 工作流

### Step 1：加载配置

读取 EXTEND.md 获取 `BASE_URL` 和 `API_KEY`。

### Step 2：理解查询需求

从用户输入提取过滤条件：
- 平台（小红书/抖音/微博…）
- 关键词或话题
- 时间范围（"最近7天"→计算日期，"本月"→月初至今）
- 数据类型（帖子/评论/创作者）
- 导出格式（JSON/CSV，或只需统计摘要）

### Step 3：查询数据

**查询帖子列表**：

```bash
curl -s "${BASE_URL}/api/data/{platform}/notes?keyword={keyword}&start_date={start_date}&end_date={end_date}&page=1&page_size=50" \
  -H "X-API-Key: ${API_KEY}"
```

**查询评论**：

```bash
curl -s "${BASE_URL}/api/data/{platform}/comments?note_id={note_id}&page=1&page_size=100" \
  -H "X-API-Key: ${API_KEY}"
```

**获取统计摘要**：

```bash
curl -s "${BASE_URL}/api/data/{platform}/stats?keyword={keyword}&start_date={start_date}&end_date={end_date}" \
  -H "X-API-Key: ${API_KEY}"
```

### Step 4：处理和输出数据

**统计摘要模式**（用户只需了解概况时）：

```
📊 数据统计报告

平台：小红书（xhs）
查询范围：2025-03-05 ~ 2025-03-12（最近7天）
关键词：AI工具

内容概况：
  帖子总数：342 条
  评论总数：1,847 条
  平均点赞：128
  平均评论：24

互动 Top 5：
  1. "推荐几款超好用的AI写作工具" - 点赞 2,341
  2. "AI绘图工具对比" - 点赞 1,892
  ...
```

**JSON 导出模式**：将 API 返回数据直接格式化输出，或询问用户保存路径后写入文件。

**CSV 导出模式**：将数据转换为 CSV 格式，字段顺序：`id, platform, title/content, author, likes, comments, shares, create_time, url`

### Step 5：分页处理

若数据量超过单页限制，自动翻页并合并：

```bash
# 获取总数
total=$(curl -s "${BASE_URL}/api/data/{platform}/notes/count?..." -H "X-API-Key: ${API_KEY}" | jq '.count')

# 计算总页数并逐页获取
pages=$(( (total + 99) / 100 ))
for page in $(seq 1 $pages); do
  curl -s "${BASE_URL}/api/data/{platform}/notes?page=${page}&page_size=100&..." \
    -H "X-API-Key: ${API_KEY}"
done
```

---

## 快速查询示例

| 需求 | 对应操作 |
|------|---------|
| "小红书最近7天AI相关帖子" | platform=xhs, keyword=AI, 时间范围=近7天 |
| "微博今天的爬取结果" | platform=wb, 时间范围=今天 |
| "导出所有B站数据为CSV" | platform=bili, 全量, CSV格式 |
| "统计各平台数据量" | 遍历所有平台获取 count |

## Extension Support

自定义配置通过 EXTEND.md 管理。参见上方 **Preferences** 部分了解路径和支持的字段。

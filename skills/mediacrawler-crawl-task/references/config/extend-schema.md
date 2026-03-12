# EXTEND.md Schema

MediaCrawler Crawl Task skill 的配置文件格式说明。

## 完整示例

```markdown
# MediaCrawler 配置

## API 连接
BASE_URL=http://113.44.56.214:8080
API_KEY=your-api-key-here

## 默认配置（可选）
DEFAULT_PLATFORM=xhs
DEFAULT_CRAWLER_TYPE=search
DEFAULT_MAX_COUNT=50
DEFAULT_ENABLE_COMMENTS=false
DEFAULT_SAVE_OPTION=db
```

## 字段说明

| 字段 | 必填 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `BASE_URL` | ✅ | string | - | MediaCrawler API 地址，不含尾部斜杠 |
| `API_KEY` | ✅ | string | - | API 认证密钥，在 MediaCrawler WebUI 中生成 |
| `DEFAULT_PLATFORM` | ❌ | string | 每次询问 | 默认平台代码（xhs/dy/ks/bili/wb/tieba/zhihu） |
| `DEFAULT_CRAWLER_TYPE` | ❌ | string | search | 默认爬取类型（search/detail/creator） |
| `DEFAULT_MAX_COUNT` | ❌ | integer | 50 | 默认最大爬取数量 |
| `DEFAULT_ENABLE_COMMENTS` | ❌ | boolean | false | 是否默认开启评论爬取 |
| `DEFAULT_SAVE_OPTION` | ❌ | string | db | 存储方式（db/csv/json/excel） |

## 解析规则

- 每行格式：`KEY=VALUE`
- `#` 开头的行为注释，忽略
- `##` 开头的行为分节标题，忽略
- 空行忽略
- VALUE 不需要引号
- BASE_URL 末尾不应有 `/`

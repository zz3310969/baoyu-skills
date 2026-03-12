#!/bin/bash
# 登录 MediaCrawler 并触发本地回调，将 session_id 发送到本地服务
# 用法: bash get-session.sh [BASE_URL] [CALLBACK_PORT]

BASE_URL="${1:-http://113.44.56.214:8080}"
CALLBACK_PORT="${2:-19527}"

echo "📡 正在从 ${BASE_URL} 获取 session..."
echo ""
echo "请输入 MediaCrawler 登录账号："
read -r -p "用户名: " USERNAME
read -r -s -p "密码: " PASSWORD
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"password\": \"${PASSWORD}\"}")

SESSION_ID=$(echo "${RESPONSE}" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "${SESSION_ID}" ]; then
  echo "❌ 登录失败: ${RESPONSE}"
  exit 1
fi

echo "✅ 登录成功！正在回调本地服务..."
curl -s "http://localhost:${CALLBACK_PORT}/callback?session_id=${SESSION_ID}" > /dev/null

echo "✨ 完成！"

#!/bin/bash

# 假的 Project Zomboid 服务器启动脚本（测试用）
# 用法: ./start-server.sh -servername <实例名>

SERVER_NAME=""

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -servername)
      SERVER_NAME="$2"
      shift 2
      ;;
    *)
      echo "[TEST] Unknown parameter: $1"
      shift
      ;;
  esac
done

if [[ -z "$SERVER_NAME" ]]; then
  echo "[TEST] Error: -servername parameter is required"
  exit 1
fi

echo "[TEST] ============================================"
echo "[TEST] Starting fake PZ server..."
echo "[TEST] Server name: $SERVER_NAME"
echo "[TEST] PID: $$"
echo "[TEST] ============================================"
echo ""

# 模拟服务器启动日志
echo "[TEST] Initializing game server..."
sleep 0.5
echo "[TEST] Loading server configuration..."
sleep 0.5
echo "[TEST] Connecting to Steam..."
sleep 0.5
echo "[TEST] Server is now running!"
echo "[TEST] Type 'save' to save the world, 'quit' to stop the server"
echo ""

# 主循环
counter=0
while true; do
  # 每秒输出测试日志行
  echo "THIS IS A TEST LINE......[$counter]"
  counter=$((counter + 1))
  
  # 非阻塞读取输入（如果有的话）
  if IFS= read -r -t 1 line; then
    line=$(echo "$line" | tr -d '\r\n')
    
    case "$line" in
      save)
        echo "[TEST] Saving world..."
        sleep 0.5
        echo "[TEST] World saved successfully!"
        ;;
      quit)
        echo "[TEST] Received quit command, shutting down..."
        sleep 0.5
        echo "[TEST] Server stopped."
        exit 0
        ;;
      "")
        # 空行，忽略
        ;;
      *)
        echo "[TEST] Unknown command: $line"
        echo "[TEST] Available commands: save, quit"
        ;;
    esac
  fi
done

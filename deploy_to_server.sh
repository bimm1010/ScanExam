#!/bin/bash
# (≧◡≦) BẬT CHẾ ĐỘ CHIẾN ĐẤU - DEPLOY ScanExercise XUYÊN MÀN ĐÊM

# Cấu hình server nhà
SERVER_IP="10.10.10.184"
SERVER_USER="bimm"
SSH_KEY="~/.ssh/id_antigravity"
REMOTE_PATH="/home/bimm/ScanExercise"

echo "🚀 Bắt đầu quá trình bay màu sang server..."

# 1. Đóng gói code (không lấy venv và node_modules)
echo "📦 Đang nén code (Bỏ qua venv và rác)..."
tar -czf scan_exercise.tar.gz . \
    --exclude='venv' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.DS_Store' \
    --exclude='scan_exercise.tar.gz'

# 2. Đẩy code lên server
echo "✈️ Đang cất cánh sang $SERVER_IP..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"
scp -i $SSH_KEY scan_exercise.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 3. Giải nén và build trên server
echo "🔧 Đang lắp ráp (Docker build) trên bimmserver... Đợi tí nhé Đại ca!"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
    tar -xzf scan_exercise.tar.gz && \
    rm scan_exercise.tar.gz && \
    docker compose down && \
    docker compose up --build -d"

# 4. Chạy migration và collectstatic (Backend)
echo "🧹 Đang dọn dẹp (Migration & Collectstatic)..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker exec scanexercise_backend python manage.py migrate && \
    docker exec scanexercise_backend python manage.py collectstatic --noinput"

# 5. Dọn dẹp cục bộ
rm scan_exercise.tar.gz

echo "✅ XONG PHIM! App đã lên sóng tại http://$SERVER_IP:5173"
echo "Chúc Đại ca quét bài vui vẻ! (≧◡≦)"

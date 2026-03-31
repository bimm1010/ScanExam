#!/bin/bash
# (≧◡≦) BẬT CHẾ ĐỘ CHIẾN ĐẤU - DEPLOY ScanExercise XUYÊN MÀN ĐÊM

# Cấu hình server nhà
SERVER_IP="10.10.10.184"
SERVER_USER="bimm"
SSH_KEY="~/.ssh/id_antigravity"
REMOTE_PATH="/home/bimm/ScanExercise"

# Màu sắc cho rực rỡ
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Bắt đầu quá trình bay màu sang server...${NC}"

# 1. Đóng gói code (không lấy venv và node_modules)
echo -e "${YELLOW}📦 Đang nén code (Bỏ qua venv và rác)...${NC}"
tar -czf scan_exercise.tar.gz \
    --exclude='venv' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.DS_Store' \
    --exclude='scan_exercise.tar.gz' \
    .

# 2. Đẩy code lên server
echo -e "${BLUE}✈️ Đang cất cánh sang $SERVER_IP...${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"
scp -i $SSH_KEY scan_exercise.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 3. Giải nén và build trên server
echo -e "${YELLOW}🔧 Đang lắp ráp (Docker build) trên bimmserver... Đợi tí nhé Đại ca!${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
    tar -xzf scan_exercise.tar.gz && \
    rm scan_exercise.tar.gz && \
    docker compose down && \
    docker compose up --build -d"

# 4. Chạy migration và collectstatic (Backend)
echo -e "${BLUE}🧹 Đang dọn dẹp (Migration & Collectstatic)...${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker exec scanexercise_backend python manage.py migrate --noinput && \
    docker exec scanexercise_backend python manage.py collectstatic --noinput"

# 5. Kiểm tra sức khỏe (Health Check)
echo -e "${YELLOW}🩺 Đang kiểm tra sức khỏe hệ thống...${NC}"
STATUS=$(ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:5173")

if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✅ NGON LÀNH! Website đã phản hồi 200 OK.${NC}"
else
    echo -e "${RED}⚠️ CẢNH BÁO: Website phản hồi mã lỗi $STATUS. Đại ca check lại nhé!${NC}"
fi

# 6. Show status
echo -e "${BLUE}📊 Trạng thái các container hiện tại:${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\" | grep scanexercise"

# 7. Dọn dẹp cục bộ
rm scan_exercise.tar.gz

echo -e "${GREEN}✅ XONG PHIM! App đã lên sóng tại http://$SERVER_IP:5173${NC}"
echo -e "Chúc Đại ca quét bài vui vẻ! (≧◡≦)"

#!/bin/bash
# (≧◡≦) BẬT CHẾ ĐỘ CHIẾN ĐẤU - DEPLOY ScanExercise XUYÊN MÀN ĐÊM
# Cập nhật: Chế độ "Xóa sạch rác" theo lệnh Đại Ca

# Cấu hình server nhà
SERVER_IP="10.10.10.172"
SERVER_USER="bimm"
SSH_KEY="~/.ssh/id_antigravity"
REMOTE_PATH="/Users/bimm/ScanExercise"

# Màu sắc cho rực rỡ
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Bắt đầu quy trình Agent-Led CI/CD chuẩn chỉ...${NC}"

# 1. Pre-flight Check (CI - Kiểm dịch)
echo -e "${YELLOW}🔍 Đang kiểm dịch code (Pre-flight Check)...${NC}"
if command -v ruff &> /dev/null; then
    ruff check backend/api backend/backend || { echo -e "${RED}❌ Lỗi: Code Backend chưa chuẩn. Dừng deploy!${NC}"; exit 1; }
fi

# 2. Đóng gói code (không lấy venv và node_modules)
echo -e "${YELLOW}📦 Đang nén code mới...${NC}"
tar -czf scan_exercise.tar.gz \
    --exclude='venv' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.DS_Store' \
    --exclude='imageEX/debug' \
    --exclude='scan_exercise.tar.gz' \
    .

# 3. DỌN DẸP CHIẾN TRƯỜNG TRÊN SERVER (QUAN TRỌNG)
echo -e "${RED}🔥 ĐANG THỰC HIỆN TIÊU THỔ KHÁNG CHIẾN TRÊN SERVER...${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "
    echo '--- Dừng và xóa triệt để project cũ ---'
    cd $REMOTE_PATH 2>/dev/null && docker compose down --rmi all --volumes --remove-orphans
    
    echo '--- Quét rác Docker toàn hệ thống (Dọn sạch Cache/Image cũ) ---'
    docker system prune -a -f
    
    echo '--- Xóa trắng thư mục project cũ ---'
    rm -rf $REMOTE_PATH
    mkdir -p $REMOTE_PATH
"

# 4. Đẩy code lên server
echo -e "${BLUE}✈️ Đang đưa code mới sang $SERVER_IP...${NC}"
scp -i $SSH_KEY scan_exercise.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 5. Giải nén và build trên server
echo -e "${YELLOW}🔧 Đang lắp ráp bản build mới (No-Cache)...${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && \
    tar -xzf scan_exercise.tar.gz && \
    rm scan_exercise.tar.gz && \
    docker compose build --no-cache && \
    docker compose up -d"

# 6. Chạy migration và collectstatic (Backend)
echo -e "${BLUE}🧹 Đang dọn dẹp (Migration & Collectstatic)...${NC}"
# Đợi container backend lên hẳn
sleep 5
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker exec scanexercise_backend python manage.py migrate --noinput && \
    docker exec scanexercise_backend python manage.py collectstatic --noinput"

# 7. Kiểm tra sức khỏe (Health Check)
echo -e "${YELLOW}🩺 Đang kiểm tra sức khỏe hệ thống...${NC}"
STATUS=$(ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:5173")

if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✅ NGON LÀNH! Website đã phản hồi 200 OK.${NC}"
else
    echo -e "${RED}⚠️ CẢNH BÁO: Website phản hồi mã lỗi $STATUS. Đại ca check lại nhé!${NC}"
fi

# 8. Show status
echo -e "${BLUE}📊 Trạng thái các container hiện tại:${NC}"
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\" | grep scanexercise"

# 9. Dọn dẹp local
rm -f scan_exercise.tar.gz

echo -e "${GREEN}✅ XONG PHIM! Hệ thống đã được dọn rác và cài mới hoàn toàn tại http://$SERVER_IP:5173${NC}"



echo -e "Chúc Đại ca quét bài vui vẻ! (≧◡≦)"

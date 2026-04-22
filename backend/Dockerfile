# Sử dụng Python Image chính thức
FROM python:3.11-slim

# Thiết lập biến môi trường
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt system dependencies cho Pillow, PostgreSQL, OpenCV, và PaddleOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    gnupg \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Node.js 20 và Gemini CLI toàn cục (Ý tưởng từ Đại Ca!)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @google/gemini-cli

# Cấu hình môi trường cho Gemini CLI
RUN mkdir -p /root/.gemini

# Cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn dự án
COPY backend/ .

# Expose port (Backend chạy trên 8000)
EXPOSE 8000

# Chạy Gunicorn thông qua config file
CMD ["gunicorn", "-c", "gunicorn_config.py", "backend.wsgi:application"]

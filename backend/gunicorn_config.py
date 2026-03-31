# Gunicorn Configuration for Production (≧◡≦)
import multiprocessing

# Bind to all interfaces on port 8000
bind = "0.0.0.0:8000"

# Workers: Recommended formula: (2 x num_cores) + 1
# Tuy nhiên ở Home Server, 4 workers là dư dả cho quét bài.
workers = 4

# Tăng timeout cho các tác vụ xử lý GPT/Gemini nặng
timeout = 120

# Log settings
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload app for efficiency
preload_app = True

# Gunicorn Configuration for Production (≧◡≦)
# Optimized for Mac Mini M4 (16GB RAM) + Local AI (Llama 3.2-Vision)

# Bind to all interfaces on port 8000
bind = "0.0.0.0:8000"

# Workers: Reduced to 2 to prevent Memory Pressure when running Vision models.
workers = 2

# Threads: Use threads to handle I/O concurrency without spawning heavy processes.
worker_class = "gthread"
threads = 4

# Timeout: High timeout for heavy AI Vision processing (5 minutes).
timeout = 300

# Worker Lifecycle: Restart workers periodically to prevent potential memory leaks.
max_requests = 1000
max_requests_jitter = 50

# Preload: Disabled to allow models to load independently and keep initial memory low.
preload_app = False

# Log settings
accesslog = "-"
errorlog = "-"
loglevel = "info"

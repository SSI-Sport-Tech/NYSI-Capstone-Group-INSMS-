# Use Python 3.10 — required for PaddleOCR compatibility
FROM python:3.10

WORKDIR /app

# System dependencies for OpenCV, PaddleOCR, and Playwright
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# This layer is cached unless requirements.txt changes (build takes ~10-20 min first time)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright's Chromium browser + its system dependencies
RUN playwright install chromium --with-deps

# Copy application source
COPY app/ ./app/

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

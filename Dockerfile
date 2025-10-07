FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for soundfile/libsndfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY voice_api.py ./

ENV PORT=8000 \
    ALLOWED_ORIGINS="*"

EXPOSE 8000

CMD ["uvicorn", "voice_api:app", "--host", "0.0.0.0", "--port", "8000"]



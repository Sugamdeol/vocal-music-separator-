# Use official python slim image
FROM python:3.10-slim

# avoid python buffering
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY ./app /app/app
COPY requirements.txt /app/requirements.txt

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git build-essential libsndfile1 \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip
RUN pip install -r /app/requirements.txt

# expose port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

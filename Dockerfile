FROM python:3.11-slim

RUN apt-get update && apt-get install -y gcc libffi-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy from backend folder
COPY backend/requirements.txt .
COPY backend/server.py .

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]

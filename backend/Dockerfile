FROM python:3.11-slim

RUN apt-get update && apt-get install -y gcc libffi-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything from the current directory (backend folder)
COPY . .

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]

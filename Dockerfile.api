FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock README.md ./
COPY backend_app ./backend_app

RUN uv pip install --system .

RUN adduser --system --group appuser
USER appuser

EXPOSE 5680

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5680/health', timeout=5)"

CMD ["uvicorn", "backend_app.main:app", "--host", "0.0.0.0", "--port", "5680"]

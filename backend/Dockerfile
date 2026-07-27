FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic.ini .
COPY alembic/ ./alembic/
COPY scripts/ ./scripts/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER app

# Default listen port; override at runtime with PORT.
EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD []

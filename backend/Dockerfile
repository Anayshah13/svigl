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
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER app

# Do NOT pin EXPOSE/PORT here. Railway injects PORT at runtime (often 8080).
# Pinning EXPOSE 8000 causes Railway's public domain target port to mismatch
# the process port → edge proxy 502 "Application failed to respond".

ENTRYPOINT ["./entrypoint.sh"]
CMD []

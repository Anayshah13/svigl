FROM python:3.12-slim

WORKDIR /app

# Pin PORT to Railway's common default so Dockerfile EXPOSE, process bind,
# and public-domain target port all agree. A previous EXPOSE 8000 left the
# Railway domain targeting 8000 while the app listened on 8080 → edge 502.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic.ini .
COPY alembic/ ./alembic/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER app

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
CMD []

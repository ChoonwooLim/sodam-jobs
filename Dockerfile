# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: Production image
FROM python:3.12-slim
WORKDIR /app

# Backend deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend code (.env is excluded by .dockerignore)
# backend/gallery_defaults/ comes along automatically.
COPY backend/ ./

# Frontend build output
COPY --from=frontend-build /app/frontend/dist /app/static

# Docs (DB seed source)
COPY docs/ /app/docs/
ENV DOCS_DIR=/app/docs

# Default environment variables — override via Orbitron dashboard
ENV DATABASE_URL=postgresql://orbitron_user:orbitron_db_pass@orbitron-sodam-jobs-db:5432/orbitron_db
ENV SECRET_KEY=sodamjobs-jwt-secret-key-2026
ENV FRONTEND_URL=https://sodam-jobs.twinverse.org
ENV UPLOAD_DIR=/app/uploads

# Unbuffered stdout/stderr so print()/log lines appear immediately in `docker logs`
ENV PYTHONUNBUFFERED=1

RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

# Honor Orbitron's $PORT injection (e.g., 3374). Falls back to 8000 for local Docker runs.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

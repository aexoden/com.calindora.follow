# Build the frontend
FROM node:25.9.0-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN npm install corepack --global --force && corepack enable && pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Build the backend
FROM rust:1.95.0-slim@sha256:e14e87345b4d5964ddcc3491d27ee046a0f23820f340c3c1e24da6880141f7c0 AS backend-builder

WORKDIR /app

# Cache dependency build
COPY Cargo.toml Cargo.lock build.rs ./
RUN mkdir -p src migrations && \
    echo 'fn main() {}' > src/main.rs && \
    touch src/lib.rs && \
    cargo build --release --locked && \
    rm -rf src

# Build the actual application
COPY . .
RUN touch src/main.rs src/lib.rs && cargo build --release --locked

# Build the runtime image
FROM debian:stable-slim@sha256:5012d0517aa0075a7150a45aae67586641e898913b7af3b08228108565b5f90c AS runtime

RUN useradd -m appuser

WORKDIR /app

COPY --chown=appuser:appuser --from=backend-builder /app/target/release/com_calindora_follow .
COPY --chown=appuser:appuser settings/ ./settings/
COPY --chown=appuser:appuser --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

USER appuser

CMD ["./com_calindora_follow"]

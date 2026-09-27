# Build the frontend
FROM ghcr.io/pnpm/pnpm:11.22.0@sha256:eba76954b37ec1ba6187f0adb39caee1e31733194857eedd01319da0af3fa00d AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Build the backend
FROM rust:1.98.1-slim@sha256:f47a8de237dcbb0b0ce1099901e60a89728e3d51f24e664b40e947171538ade7 AS backend-builder

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
FROM debian:stable-slim@sha256:5bc3287b25407c965a30f38e32603dc253a3869e1b12a21ac09bfc27fd8b13ce AS runtime

RUN useradd -m appuser

WORKDIR /app

COPY --chown=appuser:appuser --from=backend-builder /app/target/release/com_calindora_follow .
COPY --chown=appuser:appuser settings/ ./settings/
COPY --chown=appuser:appuser --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

USER appuser

CMD ["./com_calindora_follow"]

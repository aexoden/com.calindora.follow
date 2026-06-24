# Build the frontend
FROM ghcr.io/pnpm/pnpm:11.5.3@sha256:e147be8948d2e92585fd79e3429f6af12ffd827df0934e7ba6656ad6ae63381b AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Build the backend
FROM rust:1.96.0-slim@sha256:3b05f7c617a200c41c3506097f0d15fc193a1c93bfd8f141007b47cac8f95d3c AS backend-builder

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
FROM debian:stable-slim@sha256:ee12ffb55625b99d62837a72f037d9b2f18fd0c787a89c2b9a4f09666c48776c AS runtime

RUN useradd -m appuser

WORKDIR /app

COPY --chown=appuser:appuser --from=backend-builder /app/target/release/com_calindora_follow .
COPY --chown=appuser:appuser settings/ ./settings/
COPY --chown=appuser:appuser --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

USER appuser

CMD ["./com_calindora_follow"]

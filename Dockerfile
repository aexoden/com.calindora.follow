# Build the frontend
FROM ghcr.io/pnpm/pnpm:11.15.0@sha256:76b646aabaf64680ac8caf032ba5328c1b198cee6bd8ffde4495dac5cdb8deb8 AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Build the backend
FROM rust:1.97.1-slim@sha256:5c6f46a6e4472ab1ca7ba7d494e6677f2f219ebc02f32025d3986f057635ec9c AS backend-builder

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
FROM debian:stable-slim@sha256:0d97731c59efdde181e19c4a5ec22d16e9eefcb73175598b9b7bae712c7214eb AS runtime

RUN useradd -m appuser

WORKDIR /app

COPY --chown=appuser:appuser --from=backend-builder /app/target/release/com_calindora_follow .
COPY --chown=appuser:appuser settings/ ./settings/
COPY --chown=appuser:appuser --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

USER appuser

CMD ["./com_calindora_follow"]

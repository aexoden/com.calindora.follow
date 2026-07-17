# Build the frontend
FROM ghcr.io/pnpm/pnpm:11.9.0@sha256:ea4a0c09e686d3a81e1f2b606d99cad200f4c5f9053c20599820e0fc812a1c67 AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Build the backend
FROM rust:1.97.0-slim@sha256:686a437ead83701e8f871e66e838c3ec55f46b5fc235b025756396ac823bdc51 AS backend-builder

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
FROM debian:stable-slim@sha256:34363c20bd149e41365fc77b086da067ed13ab2dff4cd0612788e12e6d52c44c AS runtime

RUN useradd -m appuser

WORKDIR /app

COPY --chown=appuser:appuser --from=backend-builder /app/target/release/com_calindora_follow .
COPY --chown=appuser:appuser settings/ ./settings/
COPY --chown=appuser:appuser --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

USER appuser

CMD ["./com_calindora_follow"]

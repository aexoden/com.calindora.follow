# Build the frontend
FROM node:23-slim@sha256:148ba5855f7d4db32d877b887be561672fc50113940de812ff69e52dd35c31e6 AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

FROM rust:slim@sha256:9276ca34712033fa8d12db5f07417c0f5e7eefa41ba9925fd8b5f87627cf2fec AS backend-builder

# Build the backend
WORKDIR /app
COPY . .
RUN cargo install --path .

# Build the runtime image
FROM debian:stable-slim@sha256:88f88a2b8bd1873876a2ff15df523a66602aa57177e24b5f22064c4886ec398a AS runtime

WORKDIR /app

COPY --from=backend-builder /app/target/release/com_calindora_follow .
COPY settings/ ./settings/
COPY --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

RUN useradd -m appuser
USER appuser

CMD ["./com_calindora_follow"]

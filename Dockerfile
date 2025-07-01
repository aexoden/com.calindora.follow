# Build the frontend
FROM node:23.11.1-slim@sha256:86191b94d2a163be41f3dc7fe5e5fcaca8ba2f1be7275d98a06343483c17414a AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

FROM rust:slim@sha256:d62f2139b1f523b4b048c59af6c5e8f2cbf6ab04e91ff87b2b9afb3fab3b930a AS backend-builder

# Build the backend
WORKDIR /app
COPY . .
RUN cargo install --path .

# Build the runtime image
FROM debian:stable-slim@sha256:7e0b7fe7c6d695d615eabaea8d19adf592a6a9ff3dbd5206d3e31139b9afdfa7 AS runtime

WORKDIR /app

COPY --from=backend-builder /app/target/release/com_calindora_follow .
COPY settings/ ./settings/
COPY --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

RUN useradd -m appuser
USER appuser

CMD ["./com_calindora_follow"]

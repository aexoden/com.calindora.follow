# Build the frontend
FROM node:23.11.1-slim@sha256:86191b94d2a163be41f3dc7fe5e5fcaca8ba2f1be7275d98a06343483c17414a AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm install -g pnpm

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

FROM rust:slim@sha256:7fa728f3678acf5980d5db70960cf8491aff9411976789086676bdf0c19db39e AS backend-builder

# Build the backend
WORKDIR /app
COPY . .
RUN cargo install --path .

# Build the runtime image
FROM debian:stable-slim@sha256:7cb087f19bcc175b96fbe4c2aef42ed00733a659581a80f6ebccfd8fe3185a3d AS runtime

WORKDIR /app

COPY --from=backend-builder /app/target/release/com_calindora_follow .
COPY settings/ ./settings/
COPY --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

RUN useradd -m appuser
USER appuser

CMD ["./com_calindora_follow"]

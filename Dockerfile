# Build the frontend
FROM node:24.11.1-slim@sha256:0afb7822fac7bf9d7c1bf3b6e6c496dee6b2b64d8dfa365501a3c68e8eba94b2 AS frontend-builder

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
FROM debian:stable-slim@sha256:a771c85b2287eae7ce8fe0a4c2637d575c5d991555ae680c187c5572153648d9 AS runtime

WORKDIR /app

COPY --from=backend-builder /app/target/release/com_calindora_follow .
COPY settings/ ./settings/
COPY --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

RUN useradd -m appuser
USER appuser

CMD ["./com_calindora_follow"]

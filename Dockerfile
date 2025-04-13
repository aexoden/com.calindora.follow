# Build the frontend
FROM node:22-slim@sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b AS frontend-builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

RUN npm install -g pnpm

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

FROM rust:1.85@sha256:e51d0265072d2d9d5d320f6a44dde6b9ef13653b035098febd68cce8fa7c0bc4 AS backend-builder

# Build the backend
WORKDIR /app
COPY . .
RUN cargo install --path .

# Build the runtime image
FROM debian:bookworm-slim@sha256:b1211f6d19afd012477bd34fdcabb6b663d680e0f4b0537da6e6b0fd057a3ec3 AS runtime

WORKDIR /app

COPY --from=backend-builder /app/target/release/com_calindora_follow .
COPY settings/ ./settings/
COPY --from=frontend-builder /app/frontend/dist/ ./static/app

EXPOSE 5000

RUN useradd -m appuser
USER appuser

CMD ["./com_calindora_follow"]

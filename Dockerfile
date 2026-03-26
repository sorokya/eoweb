FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM joseluisq/static-web-server:2-alpine AS runtime

COPY --from=builder /app/dist /home/sws/public

EXPOSE 80

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . . 
RUN pnpm build

FROM joseluisq/static-web-server:2-alpine		

WORKDIR /public

COPY --from=builder /app/dist ./public

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

CMD ["static-web-server"]
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
RUN pnpm install --frozen-lockfile --filter api --filter @dsa-tutor/types
COPY apps/api ./apps/api
COPY packages/types ./packages/types
RUN pnpm --filter api build
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

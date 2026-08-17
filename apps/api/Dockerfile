FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN pnpm install --filter api... --frozen-lockfile || pnpm install --filter api...

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "dev"]

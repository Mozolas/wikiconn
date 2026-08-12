# Build context is the repository root: the API needs the workspace to resolve
# @wikiconn/shared and the lockfile.
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# The trailing "..." pulls in workspace dependencies, so @wikiconn/shared is
# compiled before the app that imports its types.
RUN pnpm --filter "@wikiconn/api..." build
# Copies the app plus only its production dependencies, workspace packages included.
RUN pnpm --filter @wikiconn/api --prod --legacy deploy /prod/api

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

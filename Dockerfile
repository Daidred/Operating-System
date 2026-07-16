# Universal container image — works on Railway, Fly.io, or any Docker host.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY base44 ./base44
COPY package.json ./
VOLUME /data
EXPOSE 3001
CMD ["node", "server/index.js"]

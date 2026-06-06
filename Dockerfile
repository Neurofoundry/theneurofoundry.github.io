FROM node:20-alpine AS public-builder

WORKDIR /build

COPY . .
RUN node tools/build-public.mjs

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=public-builder /build/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]

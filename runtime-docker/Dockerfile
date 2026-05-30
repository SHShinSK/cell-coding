FROM node:22-bookworm-slim

WORKDIR /app

COPY typescript/package.json typescript/package-lock.json* ./typescript/
RUN cd typescript && npm install

COPY typescript/ ./typescript/
COPY registry/ ./registry/

ENV CELL_REGISTRY=/app/registry
ENV CELL_PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

WORKDIR /app/typescript

CMD ["node", "--import", "tsx", "serve.ts"]

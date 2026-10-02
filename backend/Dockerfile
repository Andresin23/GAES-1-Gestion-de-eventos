FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000
# Solo arranca el servidor. Las migraciones se ejecutan por separado
# (Render: preDeployCommand; docker-compose: `command:` del servicio api).
CMD ["npx", "tsx", "src/server.ts"]

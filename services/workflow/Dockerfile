FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

EXPOSE 4001

CMD ["npm", "run", "start:dev"]

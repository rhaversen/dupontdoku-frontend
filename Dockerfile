FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN useradd -m dupontdoku_frontend_user

COPY .next/ ./.next/
COPY public/ ./public/
COPY package*.json ./

RUN chown -R dupontdoku_frontend_user:dupontdoku_frontend_user /app

USER dupontdoku_frontend_user

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]

FROM node:22-alpine

WORKDIR /app

# Prisma 5 a besoin d'OpenSSL à l'exécution (absent de l'image alpine)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/server/prisma ./packages/server/prisma
RUN npm install --workspace=packages/server

COPY packages/server ./packages/server

WORKDIR /app/packages/server

EXPOSE 3001

CMD ["npm", "run", "dev"]

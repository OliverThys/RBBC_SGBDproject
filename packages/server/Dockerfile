FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/server/package.json ./packages/server/package.json
RUN npm install --workspace=packages/server

COPY packages/server ./packages/server

WORKDIR /app/packages/server

EXPOSE 3001

CMD ["npm", "run", "dev"]

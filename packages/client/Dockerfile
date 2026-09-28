FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/client/package.json ./packages/client/package.json
RUN npm install --workspace=packages/client

COPY packages/client ./packages/client

WORKDIR /app/packages/client

EXPOSE 5173

CMD ["npm", "run", "dev"]

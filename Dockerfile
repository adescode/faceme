# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /faceme
COPY package.json ./
RUN npm install --production
RUN npm install -g webpack
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
EXPOSE 8080
FROM node:18-alpine

WORKDIR /root

COPY node/package*.json ./
RUN npm install

RUN npm install -g pm2

COPY node/ .

EXPOSE 3000

CMD ["pm2-runtime", "app.js"]

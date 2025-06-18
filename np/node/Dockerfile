FROM node:18-alpine

WORKDIR /root

COPY package*.json ./
RUN npm install

RUN npm install -g pm2

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
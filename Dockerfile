FROM node:16.17

COPY . .

WORKDIR /mizar_api/httpServer

COPY package*.json ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]

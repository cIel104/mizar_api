FROM node:16.17

COPY . .

RUN chmod -R 777 /mizar_api

WORKDIR /mizar_api/httpServer

# COPY package*.json ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]

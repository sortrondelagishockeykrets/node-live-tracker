FROM node:9-alpine
WORKDIR /app
COPY package-lock.json .
COPY package.json .
RUN npm install
COPY . .
EXPOSE 80
CMD [ "npm", "start" ]

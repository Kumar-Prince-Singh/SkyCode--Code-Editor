FROM node:22-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

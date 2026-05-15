FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

COPY . .

EXPOSE 8081

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8081"]

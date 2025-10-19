FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Set the default command based on NODE_ENV
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'production' ]; then npx sequelize-cli db:migrate && node src/server.js; else npm run dev; fi"]

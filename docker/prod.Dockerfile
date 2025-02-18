###########
# BUILDER #
###########
FROM node:22.13.1 AS builder

WORKDIR /app

COPY package.json yarn.lock ./ 

RUN npm install

COPY . .

CMD ["npm", "run", "build"]

##########
# RUNNER #
##########
FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/public public

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

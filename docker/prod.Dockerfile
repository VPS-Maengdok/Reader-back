###########
# BUILDER #
###########
FROM node:22.13.1 AS builder

WORKDIR /app

COPY package.json package-lock.json ./ 

RUN npm install

COPY . .

#CMD ["npm", "run", "build"]
RUN npm run build || (echo "Build failed!" && exit 1)

# Debugging: List files after build to check if dist exists
RUN ls -al /app/dist || (echo "dist folder not found!" && exit 1)

##########
# RUNNER #
##########
FROM node:22.13.1 AS runner

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules node_modules

COPY /init.sql .

ENV NODE_ENV=production

EXPOSE 3998

CMD ["npm", "run", "start:prod"]

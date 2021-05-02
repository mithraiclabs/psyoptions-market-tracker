FROM node:15-slim

WORKDIR /app
COPY . /app

ARG GRAPHQL_URL
ARG EXT_HOST

ENV GRAPHQL_URL=${GRAPHQL_URL}
ENV EXT_HOST=${EXT_HOST}

ENV NODE_ENV=production

RUN npm install && npm run build

FROM flashspys/nginx-static
RUN apk update && apk upgrade
COPY --from=0 /app/dist /static

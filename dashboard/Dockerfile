FROM public.ecr.aws/s6m7j8l9/node:15-slim

WORKDIR /app
COPY ./dashboard /app

ARG GRAPHQL_URL
ARG EXT_HOST

ENV GRAPHQL_URL=${GRAPHQL_URL}
ENV EXT_HOST=${EXT_HOST}

RUN npm install && npm run build

FROM flashspys/nginx-static
RUN apk update && apk upgrade
COPY --from=0 /app/dist /static

FROM public.ecr.aws/s6m7j8l9/node:15-slim
WORKDIR /app
COPY ./listener/package*.json ./
COPY ./listener/tsconfig.json ./
COPY ./listener/src ./src
COPY ./listener/types ./types
RUN npm install
RUN npm run build


FROM public.ecr.aws/s6m7j8l9/node:15-slim
WORKDIR /app
COPY ./listener/package*.json ./
RUN npm install --only=production
COPY --from=0 /app/dist .
COPY ./markets.json .

CMD ["node", "main.js"]

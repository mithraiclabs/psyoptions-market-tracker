FROM public.ecr.aws/s6m7j8l9/hayd/alpine-deno:latest

WORKDIR /app

USER deno

COPY ./listener/deps.ts .
RUN deno cache deps.ts

ADD ./listener .
RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]

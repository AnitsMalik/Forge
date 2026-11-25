FROM node:20-alpine

WORKDIR /app

COPY server.mjs ./

EXPOSE 4005

ENV MOCK_META_PORT=4005
ENV NODE_ENV=production

CMD ["node", "server.mjs"]

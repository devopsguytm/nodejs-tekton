FROM node:10.19.0-alpine3.11

COPY ./nodejs-basic/server.js    /app/server.js
COPY ./nodejs-basic/package.json /app/package.json

RUN ls -l /app

RUN cd /app && npm install

ENV WEB_PORT 8080
EXPOSE  8080

CMD ["node", "/app/server.js"]


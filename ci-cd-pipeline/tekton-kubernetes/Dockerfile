FROM node:12.16-alpine

ADD ./nodejs/bin          /app/bin
ADD ./nodejs/public       /app/public
ADD ./nodejs/routes       /app/routes
ADD ./nodejs/views        /app/views
ADD ./nodejs/app.js       /app/
ADD ./nodejs/package.json /app/

RUN ls -l /app

RUN cd /app && npm install

EXPOSE  8080

CMD ["node", "/app/bin/www"]
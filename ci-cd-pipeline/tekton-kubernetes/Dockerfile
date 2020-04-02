FROM node:12.16

COPY ./nodejs/*    /app/

RUN cd /app && npm install

EXPOSE  8080

CMD ["node", "./bin/www"]


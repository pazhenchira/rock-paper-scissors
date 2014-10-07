#FROM ubuntu:nodejs_npm
FROM dockerfile/nodejs

COPY . /src
RUN cd /src;npm install; npm install request serve-static connect
#EXPOSE 8180

CMD ["node", "/src/index.js"]


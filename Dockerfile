# Dockerfile
FROM node:18

WORKDIR /home/project

COPY ./ .

RUN npm i 
RUN npm link . 

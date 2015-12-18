FROM node:5.2.0

COPY . /usr/local/orderable-search

WORKDIR /usr/local/orderable-search

RUN npm install

CMD ["npm", "start"]

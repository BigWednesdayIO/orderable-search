FROM node:5.3.0

COPY . /usr/local/orderable-search

WORKDIR /usr/local/orderable-search

RUN npm install

CMD ["npm", "start"]

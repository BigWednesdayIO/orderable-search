'use strict';

const _ = require('lodash');
const request = require('request');

const uris = require('../lib/uris');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/search',
    handler(req, reply) {
      request({
        uri: `${uris.search}/indexes/orderable-products/query`,
        method: 'POST',
        body: req.payload,
        headers: {authorization: 'Bearer NG0TuV~u2ni#BP|'}
      }, (err, response, body) => {
        if (err) {
          console.error('Proxying error', err);
          return reply(err);
        }

        const res = reply(body).code(response.statusCode);
        _.forOwn(response.headers, (value, key) => res.header(key, value));
      });
    },
    config: {
      payload: {
        parse: false
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'search'
};

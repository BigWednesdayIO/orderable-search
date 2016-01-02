'use strict';

const Joi = require('joi');

const searchProxy = require('../lib/search_proxy');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/search',
    handler(req, reply) {
      const query = req.payload.length ? req.payload : null;
      const customerId = req.auth.credentials ? req.auth.credentials.customer_id : null;
      const date = req.query.date || new Date();

      searchProxy(query, customerId, date)
        .then(reply, err => {
          console.error('Proxying error', err);
          reply(err);
        });
    },
    config: {
      payload: {
        parse: false
      },
      validate: {
        query: {
          date: Joi.date()
        }
      },
      auth: {
        strategy: 'jwt',
        mode: 'optional'
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'search'
};

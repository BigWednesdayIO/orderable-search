'use strict';

const searchProxy = require('../lib/search_proxy');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/search',
    handler(req, reply) {
      const query = req.payload.length ? req.payload : null;
      const customerId = req.auth.credentials ? req.auth.credentials.customer_id : null;

      searchProxy(query, customerId, new Date())
        .then(reply, err => {
          console.error('Proxying error', err);
          reply(err);
        });
    },
    config: {
      payload: {
        parse: false
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

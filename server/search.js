'use strict';

const searchProxy = require('../lib/search_proxy');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/search',
    handler(req, reply) {
      searchProxy(req.auth.credentials.customer_id, req.payload.length ? req.payload : null)
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
        strategy: 'jwt'
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'search'
};

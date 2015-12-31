'use strict';

const searchProxy = require('../lib/search_proxy');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/search',
    handler(req, reply) {
      searchProxy(req.auth, req.payload.length ? req.payload : null)
        .then(reply, err => {
          console.error('Proxying error', err);
          reply(err);
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

'use strict';

const jwtScheme = require('hapi-auth-jwt2');

exports.register = function (server, options, next) {
  server.register(jwtScheme, err => {
    if (err) {
      return next(err);
    }

    server.auth.strategy('jwt', 'jwt', {
      key: new Buffer(process.env.BIGWEDNESDAY_JWT_SECRET, 'base64'),
      validateFunc: (decoded, request, callback) => {
        callback(null, true);
      },
      verifyOptions: {
        algorithms: ['HS256']
      },
      urlKey: 'token'
    });

    return next();
  });
};

exports.register.attributes = {
  name: 'jwtAuthStrategy'
};

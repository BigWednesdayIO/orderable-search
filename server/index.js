'use strict';

const Hapi = require('hapi');
const Swaggered = require('hapi-swaggered');

const plugins = [{
  register: require('hapi-version-route')
}, {
  register: Swaggered,
  options: {
    auth: false,
    info: {
      title: 'Orderable Search API',
      version: process.env.npm_package_version
    }
  }
}, {
  register: require('./indexing_jobs')
}, {
  register: require('./search')
}];

module.exports = callback => {
  const server = new Hapi.Server({
    connections: {
      routes: {
        response: {
          failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
          status: require('hapi-error-schemas').statuses()
        }
      }
    }
  });

  server.connection({port: 8080});

  server.register(plugins, err => {
    if (err) {
      return callback(err);
    }

    callback(null, server);
  });
};

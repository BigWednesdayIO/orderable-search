'use strict';

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/indexing_jobs',
    handler: (request, reply) => {
      reply().code(202);
    },
    config: {
      tags: ['api']
    }
  });

  next();
};

module.exports.register.attributes = {name: 'indexing-jobs'};

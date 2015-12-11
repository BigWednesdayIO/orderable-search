'use strict';

const Joi = require('joi');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/indexing_jobs',
    handler: (request, reply) => {
      reply().code(202);
    },
    config: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          trigger_type: Joi.string().required().valid('product', 'linked_product').description('Type of resource that triggered the job'),
          action: Joi.string().required().valid('add', 'remove', 'update').description('Type of action that triggered the job'),
          data: Joi.object({
            id: Joi.string().required().description('The identifier of the triggering resource')
          }).required().meta({className: 'IndexingJobData'}).description('Data associated with the action')
        }).meta({className: 'IndexingJob'}).description('An indexing job')
      }
    }
  });

  next();
};

module.exports.register.attributes = {name: 'indexing-jobs'};

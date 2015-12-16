'use strict';

const Joi = require('joi');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/indexing_jobs',
    handler: (request, reply) => {
      const indexer = require(`../lib/indexers/${request.payload.trigger_type}.js`);
      indexer[request.payload.action](request.payload.data);

      reply().code(202);
    },
    config: {
      tags: ['api'],
      validate: {
        payload: Joi.object({
          trigger_type: Joi.string().required().valid('product', 'linked_product').description('Type of resource that triggered the job'),
          action: Joi.string().required().when('trigger_type', {is: 'product', then: Joi.valid('update'), otherwise: Joi.valid('add', 'remove', 'update')}).description('Type of action that triggered the job'),
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

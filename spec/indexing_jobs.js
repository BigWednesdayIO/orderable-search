'use strict';

const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/indexing_jobs', () => {
  const payload = {trigger_type: 'product', action: 'update', data: {id: '1'}};

  describe('post', () => {
    let postResponse;

    before(() =>
      specRequest({url: '/indexing_jobs', method: 'POST', payload})
        .then(response => postResponse = response));

    it('returns http 202', () => {
      expect(postResponse.statusCode).to.equal(202);
    });

    describe('validation payload', () => {
      it('rejects request when trigger_type is missing', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "trigger_type" fails because ["trigger_type" is required]');
          }));

      it('rejects request when trigger_type is not "product" or "linked_product"', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'thing'}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "trigger_type" fails because ["trigger_type" must be one of [product, linked_product]]');
          }));

      it('rejects request when action is missing', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'product'}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "action" fails because ["action" is required]');
          }));

      it('rejects request when action is not "add", "remove" or "update" for linked_product', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'linked_product', action: 'x'}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "action" fails because ["action" must be one of [add, remove, update]]');
          }));

      it('rejects request when action is not "update" for product', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'product', action: 'add'}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "action" fails because ["action" must be one of [update]]');
          }));

      it('rejects request when data is missing', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'product', action: 'update'}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "data" fails because ["data" is required]');
          }));

      it('rejects request when data is missing id', () =>
        specRequest({url: '/indexing_jobs', method: 'POST', payload: {trigger_type: 'product', action: 'update', data: {}}})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', 'child "data" fails because [child "id" fails because ["id" is required]]');
          }));
    });
  });
});

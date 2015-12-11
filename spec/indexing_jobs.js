'use strict';

const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/indexing_jobs', () => {
  describe('post', () => {
    let postResponse;

    before(() =>
      specRequest({url: '/indexing_jobs', method: 'POST', payload: {}})
        .then(response => postResponse = response));

    it('returns http 202', () => {
      expect(postResponse.statusCode).to.equal(202);
    });
  });
});

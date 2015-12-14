'use strict';

const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');

const indexer = require('../lib/linked_product_indexer');

describe('Linked Product Indexer', () => {
  let putToSearchApi;
  let deleteFromSearchAPI;
  let putBody;
  let consoleErrorSpy;
  const product = {name: 'a product', category: 'abc', brand: 'own brand'};

  beforeEach(() => {
    putToSearchApi = nock('http://localhost:1111')
      .put('/indexes/orderable-products/supplier_product1')
      .reply(200, (uri, body) => putBody = JSON.parse(body));

    deleteFromSearchAPI = nock('http://localhost:1111')
      .delete('/indexes/orderable-products/supplier_product1')
      .reply(204, null);

    nock('http://localhost:1111')
      .put('/indexes/orderable-products/supplier_product2')
      .reply(200, {})
      .put('/indexes/orderable-products/error')
      .replyWithError('A non-HTTP search API error')
      .put('/indexes/orderable-products/500')
      .reply(500, {message: 'Internal Server Error'})
      .delete('/indexes/orderable-products/error')
      .replyWithError('A non-HTTP search API error')
      .delete('/indexes/orderable-products/500')
      .reply(500, {message: 'Internal Server Error'});

    nock('http://localhost:2222')
      .get('/products/p1')
      .reply(200, product)
      .persist()
      .get('/products/error')
      .replyWithError('A non-HTTP product API error')
      .get('/products/500')
      .reply(500, {message: 'Internal Server Error'});

    consoleErrorSpy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    consoleErrorSpy.restore();
    nock.cleanAll();
  });

  ['add', 'update'].forEach(fn => {
    describe(fn, () => {
      beforeEach(done => {
        indexer[fn]({id: 'supplier_product1', supplier_id: 's1', product_id: 'p1'});

        // allow async operation to complete
        setTimeout(done, 100);
      });

      it('adds the supplier\'s product to the index', () => {
        expect(putToSearchApi.isDone()).to.equal(true, 'Failed to make PUT to Search API');
      });

      it('sends the supplier id in the index request', () => {
        expect(putBody).to.have.property('supplier_id', 's1');
      });

      it('sends the product attributes in the index request', () => {
        for (const property in product) {
          if (product.hasOwnProperty(property)) {
            expect(putBody).to.have.property(property, product[property]);
          }
        }
      });

      it('sends product api errors to console.error', done => {
        indexer[fn]({id: 'supplier_product2', supplier_id: 's1', product_id: 'error'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
          expect(consoleErrorSpy.lastCall.args[0].message).to.equal('A non-HTTP product API error');
          done();
        }, 500);
      });

      it('sends product api non-200 responses to console.error', done => {
        indexer[fn]({id: 'supplier_product2', supplier_id: 's1', product_id: '500'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
          expect(consoleErrorSpy.lastCall.args[0].message).to.equal('Product API HTTP error 500 - {"message":"Internal Server Error"}');
          done();
        }, 500);
      });

      it('sends search api errors to console.error', done => {
        indexer[fn]({id: 'error', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
          expect(consoleErrorSpy.lastCall.args[0].message).to.equal('A non-HTTP search API error');
          done();
        }, 500);
      });

      it('sends search api non-200 responses to console.error', done => {
        indexer[fn]({id: '500', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
          expect(consoleErrorSpy.lastCall.args[0].message).to.equal('Search API HTTP error 500 - {"message":"Internal Server Error"}');
          done();
        }, 500);
      });
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      indexer.remove('supplier_product1');
    });

    it('removes the supplier\'s product from the index', done => {
      setImmediate(() => {
        expect(deleteFromSearchAPI.isDone()).to.equal(true, 'Failed to make DELETE request to Search API');
        done();
      });
    });

    it('sends search api errors to console.error', done => {
      indexer.remove('error');

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
        expect(consoleErrorSpy.lastCall.args[0].message).to.equal('A non-HTTP search API error');
        done();
      }, 500);
    });

    it('sends search api non-200 responses to console.error', done => {
      indexer.remove('500');

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.be.an('error');
        expect(consoleErrorSpy.lastCall.args[0].message).to.equal('Search API HTTP error 500 - {"message":"Internal Server Error"}');
        done();
      }, 500);
    });
  });
});

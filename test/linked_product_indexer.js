'use strict';

const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');

const indexer = require('../lib/linked_product_indexer');

const searchApi = 'http://localhost:1111';
const productApi = 'http://localhost:2222';

describe('Linked Product Indexer', () => {
  let putToSearchApi;
  let deleteFromSearchAPI;
  let putBody;
  let consoleErrorSpy;
  const product = {name: 'a product', category: 'abc', brand: 'own brand'};

  beforeEach(() => {
    putToSearchApi = nock(searchApi)
      .put('/indexes/orderable-products/supplier_product1')
      .reply(200, (uri, body) => putBody = JSON.parse(body));

    deleteFromSearchAPI = nock(searchApi)
      .delete('/indexes/orderable-products/supplier_product1')
      .reply(204, null);

    nock(searchApi)
      .put('/indexes/orderable-products/supplier_product2')
      .reply(200, {})
      .put('/indexes/orderable-products/error')
      .replyWithError('A non-HTTP error')
      .put('/indexes/orderable-products/500')
      .reply(500, {message: 'Internal Server Error'})
      .delete('/indexes/orderable-products/error')
      .replyWithError('A non-HTTP error')
      .delete('/indexes/orderable-products/500')
      .reply(500, {message: 'Internal Server Error'});

    nock(productApi)
      .get('/products/p1')
      .reply(200, product)
      .persist()
      .get('/products/error')
      .replyWithError('A non-HTTP error')
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
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`GET ${productApi}/products/error failed with: A non-HTTP error`);
          done();
        }, 500);
      });

      it('sends product api non-200 responses to console.error', done => {
        indexer[fn]({id: 'supplier_product2', supplier_id: 's1', product_id: '500'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`GET ${productApi}/products/500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
          done();
        }, 500);
      });

      it('sends search api errors to console.error', done => {
        indexer[fn]({id: 'error', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`PUT ${searchApi}/indexes/orderable-products/error failed with: A non-HTTP error`);
          done();
        }, 500);
      });

      it('sends search api non-200 responses to console.error', done => {
        indexer[fn]({id: '500', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`PUT ${searchApi}/indexes/orderable-products/500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
          done();
        }, 500);
      });
    });
  });

  describe('remove', () => {
    it('removes the supplier\'s product from the index', done => {
      indexer.remove('supplier_product1');

      setTimeout(() => {
        expect(deleteFromSearchAPI.isDone()).to.equal(true, 'Failed to make DELETE request to Search API');
        done();
      }, 500);
    });

    it('sends search api errors to console.error', done => {
      indexer.remove('error');

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(`DELETE ${searchApi}/indexes/orderable-products/error failed with: A non-HTTP error`);
        done();
      }, 500);
    });

    it('sends search api non-200 responses to console.error', done => {
      indexer.remove('500');

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(`DELETE ${searchApi}/indexes/orderable-products/500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
        done();
      }, 500);
    });
  });
});

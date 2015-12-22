'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');

const indexer = require('../../lib/indexers/linked_product');
const uris = require('../../lib/uris');

describe('Linked Product Indexer', () => {
  let putToSearchApi;
  let deleteFromSearchAPI;
  let putBody;
  let consoleErrorSpy;
  const product = {
    name: 'a product',
    category: {id: 'c1', name: 'category', _metadata: {hierarchy: ['c', 'c.c1']}},
    brand: 'own brand'
  };

  beforeEach(() => {
    putToSearchApi = nock(uris.search, {reqheaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}})
      .put('/indexes/orderable-products/supplier_product1')
      .reply(200, (uri, body) => putBody = JSON.parse(body));

    deleteFromSearchAPI = nock(uris.search, {reqheaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}})
      .delete('/indexes/orderable-products/supplier_product1')
      .reply(204, null);

    nock(uris.search, {reqheaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}})
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

    nock(uris.products, {reqheaders: {authorization: `Bearer ${process.env.BIGWEDNESDAY_JWT}`}})
      .get('/products/p1?expand[]=category')
      .reply(200, product)
      .persist()
      .get('/products/error?expand[]=category')
      .replyWithError('A non-HTTP error')
      .get('/products/500?expand[]=category')
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
        indexer[fn]({id: 'supplier_product1', supplier_id: 's1', product_id: 'p1', price: 15, was_price: 20.99});

        // allow async operation to complete
        setTimeout(done, 100);
      });

      it('adds the supplier\'s product to the index', () => {
        expect(putToSearchApi.isDone()).to.equal(true, 'Failed to make PUT to Search API');
      });

      it('sends the supplier id in the index request', () => {
        expect(putBody).to.have.property('supplier_id', 's1');
      });

      it('sends the supplier price in the index request', () => {
        expect(putBody).to.have.property('price', 15);
      });

      it('sends the supplier was price in the index request', () => {
        expect(putBody).to.have.property('was_price', 20.99);
      });

      _.forOwn(product, (value, key) => {
        if (key === 'category') {
          it('sends the category id in the index requests', () => {
            expect(putBody).to.have.property('category_id', 'c1');
          });

          it('sends the category name in the index requests', () => {
            expect(putBody).to.have.property('category_name', 'category');
          });

          it('sends the category hierarchy in the index requests', () => {
            expect(putBody).to.have.property('category_hierarchy');
            expect(putBody.category_hierarchy).to.deep.equal(['c', 'c.c1']);
          });

          it('omits the category attribute in the index requests', () => {
            expect(putBody).to.not.have.property('category');
          });
        } else {
          it(`sends the ${key} attribute in the index requests`, () => {
            expect(putBody).to.have.property(key, value);
          });
        }
      });

      it('sends product api errors to console.error', done => {
        indexer[fn]({id: 'supplier_product2', supplier_id: 's1', product_id: 'error'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`GET ${uris.products}/products/error?expand[]=category failed with: A non-HTTP error`);
          done();
        }, 500);
      });

      it('sends product api non-200 responses to console.error', done => {
        indexer[fn]({id: 'supplier_product2', supplier_id: 's1', product_id: '500'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`GET ${uris.products}/products/500?expand[]=category failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
          done();
        }, 500);
      });

      it('sends search api errors to console.error', done => {
        indexer[fn]({id: 'error', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`PUT ${uris.search}/indexes/orderable-products/error failed with: A non-HTTP error`);
          done();
        }, 500);
      });

      it('sends search api non-2xx responses to console.error', done => {
        indexer[fn]({id: '500', supplier_id: 's1', product_id: 'p1'});

        setTimeout(() => {
          expect(consoleErrorSpy.lastCall.args[0]).to.equal(`PUT ${uris.search}/indexes/orderable-products/500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
          done();
        }, 500);
      });
    });
  });

  describe('remove', () => {
    it('removes the supplier\'s product from the index', done => {
      indexer.remove({id: 'supplier_product1'});

      setTimeout(() => {
        expect(deleteFromSearchAPI.isDone()).to.equal(true, 'Failed to make DELETE request to Search API');
        done();
      }, 500);
    });

    it('sends search api errors to console.error', done => {
      indexer.remove({id: 'error'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(`DELETE ${uris.search}/indexes/orderable-products/error failed with: A non-HTTP error`);
        done();
      }, 500);
    });

    it('sends search api non-200 responses to console.error', done => {
      indexer.remove({id: '500'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(`DELETE ${uris.search}/indexes/orderable-products/500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);
        done();
      }, 500);
    });
  });
});

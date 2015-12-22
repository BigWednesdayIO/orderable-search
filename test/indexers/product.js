'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');

const indexer = require('../../lib/indexers/product');
const uris = require('../../lib/uris');

const supplierLinkedProducts = [
  {id: 's1', _metadata: {linked_product_id: 's1p'}},
  {id: 's2', _metadata: {linked_product_id: 's2p'}}
];

const existingIndexedProducts = [
  {objectID: 's1p', product_id: 'p1', supplier_id: 's1', price: 15.50, was_price: 21.99},
  {objectID: 's2p', product_id: 'p1', supplier_id: 's2', price: 8.10, was_price: 12.65}
];

const updatedProduct = {
  id: 'p1',
  name: 'new product name',
  category: {id: 'c1', name: 'category', _metadata: {hierarchy: ['c', 'c.c1']}},
  brand: 'mars',
  product_type_attributes: [{
    name: 'attribute1',
    values: ['one', 'two']
  }, {
    name: 'attribute2',
    values: [1, 2]
  }]
};

describe('Product indexer', () => {
  describe('update', () => {
    let putToSearchApi;
    let indexBatch;
    let consoleErrorSpy;

    beforeEach(done => {
      nock(uris.suppliers, {reqheaders: {authorization: `Bearer ${process.env.BIGWEDNESDAY_JWT}`, host: () => true}})
        .get('/suppliers?supplies_product=p1')
        .reply(200, supplierLinkedProducts)
        .get('/suppliers?supplies_product=supplier_api_error')
        .replyWithError('A non-HTTP error')
        .get('/suppliers?supplies_product=supplier_api_500')
        .reply(500, {message: 'Internal Server Error'})
        .get('/suppliers?supplies_product=search_api_get_error')
        .reply(200, [{id: 's1', _metadata: {linked_product_id: 'search_api_get_error'}}])
        .get('/suppliers?supplies_product=search_api_get_500')
        .reply(200, [{id: 's1', _metadata: {linked_product_id: 'search_api_get_500'}}])
        .get('/suppliers?supplies_product=search_api_batch_error')
        .reply(200, [{id: 's1', _metadata: {linked_product_id: 'search_api_batch_error'}}])
        .get('/suppliers?supplies_product=search_api_batch_500')
        .reply(200, [{id: 's1', _metadata: {linked_product_id: 'search_api_batch_500'}}]);

      nock(uris.search, {reqheaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`, host: () => true}})
        .get('/indexes/orderable-products?id[]=s1p&id[]=s2p')
        .reply(200, existingIndexedProducts)
        .get('/indexes/orderable-products?id[]=search_api_get_error')
        .replyWithError('A non-HTTP error')
        .get('/indexes/orderable-products?id[]=search_api_get_500')
        .reply(500, {message: 'Internal Server Error'})
        .get('/indexes/orderable-products?id[]=search_api_batch_error')
        .reply(200, [{objectID: 'search_api_batch_error'}])
        .get('/indexes/orderable-products?id[]=search_api_batch_500')
        .reply(200, [{objectID: 'search_api_batch_500'}]);

      putToSearchApi = nock(uris.search, {reqheaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`, host: () => true}})
        .post('/indexes/orderable-products/batch')
        .reply(200, (uri, body) => indexBatch = JSON.parse(body));

      consoleErrorSpy = sinon.spy(console, 'error');

      indexer.update(updatedProduct);

      // allow async operations to complete
      setTimeout(done, 500);
    });

    afterEach(() => {
      nock.cleanAll();
      consoleErrorSpy.restore();
    });

    it('sends an index request for each supplier product', () => {
      expect(putToSearchApi.isDone()).to.equal(true, 'Failed to make Search API batch request');

      expect(indexBatch.requests).to.have.length(supplierLinkedProducts.length);
      expect(indexBatch.requests.map(r => r.objectID)).to.deep.equal(['s1p', 's2p']);
    });

    it('sends the current supplier id in the index requests', () => {
      expect(indexBatch.requests.map(r => r.body.supplier_id)).to.deep.equal(['s1', 's2']);
    });

    it('sends the current supplier price in the index requests', () => {
      expect(indexBatch.requests.map(r => r.body.price)).to.deep.equal([15.50, 8.10]);
    });

    it('sends the current supplier was price in the index requests', () => {
      expect(indexBatch.requests.map(r => r.body.was_price)).to.deep.equal([21.99, 12.65]);
    });

    _.forOwn(updatedProduct, (value, key) => {
      if (key === 'category') {
        it('sends the category id in the index requests', () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.have.property('category_id', 'c1');
          });
        });

        it('sends the category name in the index requests', () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.have.property('category_name', 'category');
          });
        });

        it('sends the category hierarchy in the index requests', () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.have.property('category_hierarchy');
            expect(request.body.category_hierarchy).to.deep.equal(['c', 'c.c1']);
          });
        });

        it('omits the category attribute in the index requests', () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.not.have.property('category');
          });
        });
      } else if (key === 'product_type_attributes') {
        updatedProduct.product_type_attributes.forEach(attribute => {
          it(`sends the ${attribute.name} attribute in the index requests`, () => {
            indexBatch.requests.forEach(request => {
              expect(request.body).to.have.property(attribute.name);
              expect(request.body[attribute.name]).to.deep.equal(attribute.values);
            });
          });
        });

        it('omits the product_type_attributes attribute in the index requests', () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.not.have.property('product_type_attributes');
          });
        });
      } else {
        it(`sends the ${key} attribute in the index requests`, () => {
          indexBatch.requests.forEach(request => {
            expect(request.body).to.have.property(key, value);
          });
        });
      }
    });

    it('sends suppliers api errors to console.error', done => {
      indexer.update({id: 'supplier_api_error'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `GET ${uris.suppliers}/suppliers?supplies_product=supplier_api_error failed with: A non-HTTP error`);

        done();
      }, 500);
    });

    it('sends suppliers api non-200 responses to console.error', done => {
      indexer.update({id: 'supplier_api_500'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `GET ${uris.suppliers}/suppliers?supplies_product=supplier_api_500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);

        done();
      }, 500);
    });

    it('sends search api get by ids errors to console.error', done => {
      indexer.update({id: 'search_api_get_error'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `GET ${uris.search}/indexes/orderable-products?id[]=search_api_get_error failed with: A non-HTTP error`);

        done();
      }, 500);
    });

    it('sends search api get by ids non-200 responses to console.error', done => {
      indexer.update({id: 'search_api_get_500'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `GET ${uris.search}/indexes/orderable-products?id[]=search_api_get_500 failed with: HTTP error 500 - {"message":"Internal Server Error"}`);

        done();
      }, 500);
    });

    it('sends search api batch errors to console.error', done => {
      nock(uris.search)
        .post('/indexes/orderable-products/batch')
        .replyWithError('A non-HTTP error');

      indexer.update({id: 'search_api_batch_error'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `POST ${uris.search}/indexes/orderable-products/batch failed with: A non-HTTP error`);

        done();
      }, 500);
    });

    it('sends search api batch non-200 responses to console.error', done => {
      nock(uris.search)
        .post('/indexes/orderable-products/batch')
        .reply(500, {message: 'Internal Server Error'});

      indexer.update({id: 'search_api_batch_500'});

      setTimeout(() => {
        expect(consoleErrorSpy.lastCall.args[0]).to.equal(
          `POST ${uris.search}/indexes/orderable-products/batch failed with: HTTP error 500 - {"message":"Internal Server Error"}`);

        done();
      }, 500);
    });
  });
});

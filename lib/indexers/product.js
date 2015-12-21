'use strict';

const request = require('request');

const indexProductBuilder = require('./index_product_builder');
const uris = require('../uris');

module.exports.update = productData => {
  const getSuppliersUri = `${uris.suppliers}/suppliers?supplies_product=${productData.id}`;

  request.get({url: getSuppliersUri, headers: {authorization: `Bearer ${process.env.BIGWEDNESDAY_JWT}`}}, (err, response, body) => {
    if (err) {
      return console.error(`GET ${getSuppliersUri} failed with: ${err.message}`);
    }

    if (response.statusCode !== 200) {
      return console.error(`GET ${getSuppliersUri} failed with: HTTP error ${response.statusCode} - ${body}`);
    }

    const suppliers = JSON.parse(body);

    if (suppliers.length === 0) {
      return undefined;
    }

    const linkedProductIds = suppliers.map(s => s._metadata.linked_product_id);

    const getProductsFromSearchUri = `${uris.search}/indexes/orderable-products?id[]=${linkedProductIds.join('&id[]=')}`;

    request.get({url: getProductsFromSearchUri, headers: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}}, (err, response, body) => {
      if (err) {
        return console.error(`GET ${getProductsFromSearchUri} failed with: ${err.message}`);
      }

      if (response.statusCode !== 200) {
        return console.error(`GET ${getProductsFromSearchUri} failed with: HTTP error ${response.statusCode} - ${body}`);
      }

      const products = JSON.parse(body);
      const batchUri = `${uris.search}/indexes/orderable-products/batch`;

      request.post({
        url: batchUri,
        headers: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`},
        json: {
          requests: products.map(product => ({
            action: 'upsert',
            objectID: product.objectID,
            body: indexProductBuilder.build(product, productData)
          }))
        }
      }, (err, response, body) => {
        if (err) {
          return console.error(`POST ${batchUri} failed with: ${err.message}`);
        }

        if (response.statusCode !== 200) {
          return console.error(`POST ${batchUri} failed with: HTTP error ${response.statusCode} - ${JSON.stringify(body)}`);
        }
      });
    });
  });
};

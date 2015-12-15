'use strict';

const request = require('request');

const searchApi = 'http://localhost:1111';
const suppliersApi = 'http://localhost:3333';

module.exports.update = productData => {
  const getSuppliersUri = `${suppliersApi}/suppliers?supplies_product=${productData.id}`;

  request.get(getSuppliersUri, (err, response, body) => {
    if (err) {
      return console.error(`GET ${getSuppliersUri} failed with: ${err.message}`);
    }

    if (response.statusCode !== 200) {
      return console.error(`GET ${getSuppliersUri} failed with: HTTP error ${response.statusCode} - ${body}`);
    }

    const suppliers = JSON.parse(body);
    const linkedProductIds = suppliers.map(s => s._metadata.linked_product_id);

    const getProductsFromSearchUri = `${searchApi}/indexes/orderable-products?id[]=${linkedProductIds.join('&id[]=')}`;

    request.get(getProductsFromSearchUri, (err, response, body) => {
      if (err) {
        return console.error(`GET ${getProductsFromSearchUri} failed with: ${err.message}`);
      }

      if (response.statusCode !== 200) {
        return console.error(`GET ${getProductsFromSearchUri} failed with: HTTP error ${response.statusCode} - ${body}`);
      }

      const products = JSON.parse(body);
      const batchUri = `${searchApi}/indexes/orderable-products/batch`;

      request.post({
        url: batchUri,
        json: {
          requests: products.map(product => ({
            action: 'upsert',
            objectID: product.objectID,
            body: Object.assign({
              supplier_id: product.supplier_id,
              price: product.price,
              was_price: product.was_price
            }, productData)
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

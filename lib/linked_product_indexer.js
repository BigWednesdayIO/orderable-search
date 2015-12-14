'use strict';

const request = require('request');

const getProduct = (id, callback) => {
  const uri = `http://localhost:2222/products/${id}`;

  request(uri, (err, response, body) => {
    if (err) {
      return callback(new Error(`GET ${uri} failed with: ${err.message}`));
    }

    if (response.statusCode === 200) {
      return callback(null, JSON.parse(body));
    }

    callback(new Error(`GET ${uri} failed with: HTTP error ${response.statusCode} - ${body}`));
  });
};

const insertOrUpdateToIndex = linkedProduct => {
  getProduct(linkedProduct.product_id, (err, productData) => {
    if (err) {
      return console.error(err.message);
    }

    const indexedProduct = Object.assign({supplier_id: linkedProduct.supplier_id}, productData);
    const uri = `http://localhost:1111/indexes/orderable-products/${linkedProduct.id}`;

    request.put({
      url: uri,
      json: indexedProduct
    }, (err, response, body) => {
      if (err) {
        return console.error(`PUT ${uri} failed with: ${err.message}`);
      }

      if (response.statusCode !== 200) {
        return console.error(`PUT ${uri} failed with: HTTP error ${response.statusCode} - ${JSON.stringify(body)}`);
      }
    });
  });
};

module.exports = {
  add: insertOrUpdateToIndex,
  update: insertOrUpdateToIndex,
  remove(id) {
    const uri = `http://localhost:1111/indexes/orderable-products/${id}`;
    request.del(uri, (err, response, body) => {
      if (err) {
        return console.error(`DELETE ${uri} failed with: ${err.message}`);
      }

      if (response.statusCode !== 200) {
        return console.error(`DELETE ${uri} failed with: HTTP error ${response.statusCode} - ${body}`);
      }
    });
  }
};
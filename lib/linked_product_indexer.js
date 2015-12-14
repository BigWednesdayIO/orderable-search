'use strict';

const request = require('request');

const getProduct = (id, callback) => {
  request(`http://localhost:2222/products/${id}`, (err, response, body) => {
    if (err) {
      return callback(err);
    }

    if (response.statusCode === 200) {
      return callback(null, JSON.parse(body));
    }

    callback(new Error(`Product API HTTP error ${response.statusCode} - ${body}`));
  });
};

const insertOrUpdateToIndex = linkedProduct => {
  getProduct(linkedProduct.product_id, (err, productData) => {
    if (err) {
      return console.error(err);
    }

    const indexedProduct = Object.assign({supplier_id: linkedProduct.supplier_id}, productData);

    request.put({
      url: `http://localhost:1111/indexes/orderable-products/${linkedProduct.id}`,
      json: indexedProduct
    }, (err, response, body) => {
      if (err) {
        return console.error(err);
      }

      if (response.statusCode !== 200) {
        return console.error(new Error(`Search API HTTP error ${response.statusCode} - ${JSON.stringify(body)}`));
      }
    });
  });
};

module.exports = {
  add: insertOrUpdateToIndex,
  update: insertOrUpdateToIndex,
  remove(id) {
    request.del(`http://localhost:1111/indexes/orderable-products/${id}`, (err, response, body) => {
      if (err) {
        return console.error(err);
      }

      if (response.statusCode !== 200) {
        return console.error(new Error(`Search API HTTP error ${response.statusCode} - ${body}`));
      }
    });
  }
};

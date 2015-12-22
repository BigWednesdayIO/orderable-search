'use strict';

const request = require('request');

const indexProductBuilder = require('./index_product_builder');
const uris = require('../uris');

const getProduct = (id, callback) => {
  const uri = `${uris.products}/products/${id}?expand[]=category`;

  request({url: uri, headers: {authorization: `Bearer ${process.env.BIGWEDNESDAY_JWT}`}}, (err, response, body) => {
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

    const uri = `${uris.search}/indexes/orderable-products/${linkedProduct.id}`;

    request.put({
      url: uri,
      headers: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`},
      json: indexProductBuilder.build(linkedProduct, productData)
    }, (err, response, body) => {
      if (err) {
        return console.error(`PUT ${uri} failed with: ${err.message}`);
      }

      if (response.statusCode.toString().indexOf('2') !== 0) {
        return console.error(`PUT ${uri} failed with: HTTP error ${response.statusCode} - ${JSON.stringify(body)}`);
      }
    });
  });
};

module.exports = {
  add: insertOrUpdateToIndex,
  update: insertOrUpdateToIndex,
  remove(id) {
    const uri = `${uris.search}/indexes/orderable-products/${id}`;
    request.del({url: uri, headers: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}}, (err, response, body) => {
      if (err) {
        return console.error(`DELETE ${uri} failed with: ${err.message}`);
      }

      if (response.statusCode !== 200) {
        return console.error(`DELETE ${uri} failed with: HTTP error ${response.statusCode} - ${body}`);
      }
    });
  }
};

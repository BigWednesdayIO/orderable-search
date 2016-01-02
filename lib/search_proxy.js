'use strict';

const _ = require('lodash');
const Decimal = require('decimal');
const request = require('request');

const uris = require('./uris');

const getCustomerPriceAdjustments = (customerId, date) => {
  const uri = `${uris.customers}/customers/${customerId}/product_price_adjustments?date=${date.toISOString()}`;

  return new Promise((resolve, reject) => {
    request({uri, headers: {authorization: process.env.BIGWEDNESDAY_JWT}}, (err, response, body) => {
      if (err) {
        console.error(`Error getting customer price adjustments from ${uri}`, err);
        return reject(err);
      }

      if (response.statusCode === 200) {
        return resolve(JSON.parse(body));
      }

      return reject(new Error(`${response.statusCode} response from ${uri}. ${body}`));
    });
  });
};

const getCustomerMemberships = customerId => {
  const uri = `${uris.customers}/customers/${customerId}/memberships`;

  return new Promise((resolve, reject) => {
    request({uri, headers: {authorization: process.env.BIGWEDNESDAY_JWT}}, (err, response, body) => {
      if (err) {
        console.error(`Error getting customer memberships from ${uri}`, err);
        return reject(err);
      }

      if (response.statusCode === 200) {
        return resolve(JSON.parse(body));
      }

      return reject(new Error(`${response.statusCode} response from ${uri}. ${body}`));
    });
  });
};

const getSearchResults = query => {
  const uri = `${uris.search}/indexes/orderable-products/query`;

  return new Promise((resolve, reject) => {
    request({uri, method: 'POST', body: query, headers: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`}},
      (err, response, body) => {
        if (err) {
          console.error(`Error proxying to ${uri}`, err);
          return reject(err);
        }

        if (response.statusCode === 200) {
          return resolve(JSON.parse(body));
        }

        return reject(new Error(`${response.statusCode} response from ${uri}. ${body}`));
      });
  });
};

const getGroupAdjustmentsForProducts = (groupId, supplierId, date, ids) => {
  const uri = `${uris.suppliers}/suppliers/${supplierId}/price_adjustments?price_adjustment_group_id=${groupId}&date=${date.toISOString()}&linked_product_id[]=${ids.join('&linked_product_id[]=')}`;

  return new Promise((resolve, reject) => {
    request({uri, headers: {authorization: process.env.BIGWEDNESDAY_JWT}}, (err, response, body) => {
      if (err) {
        console.error(`Error getting supplier price adjustments from ${uri}`, err);
        return reject(err);
      }

      if (response.statusCode === 200) {
        return resolve(JSON.parse(body));
      }

      return reject(new Error(`${response.statusCode} response from ${uri}. ${body}`));
    });
  });
};

const calculatePrice = (basePrice, customerAdjustment, groupAdjustment) => {
  if (customerAdjustment && customerAdjustment.type === 'value_override') {
    return customerAdjustment.amount;
  }

  let price = new Decimal(basePrice);

  if (groupAdjustment && groupAdjustment.type === 'value_override') {
    price = new Decimal(groupAdjustment.amount);
  }

  if (groupAdjustment) {
    if (groupAdjustment.type === 'value_adjustment') {
      price = price.add(groupAdjustment.amount);
    }

    if (groupAdjustment.type === 'percentage_adjustment') {
      price = price.mul(groupAdjustment.amount / 100);
    }
  }

  if (customerAdjustment) {
    if (customerAdjustment.type === 'value_adjustment') {
      price = price.add(customerAdjustment.amount);
    } else if (customerAdjustment.type === 'percentage_adjustment') {
      price = price.mul(customerAdjustment.amount / 100);
    }
  }

  return price.toNumber();
};

const productHasCustomerOverride = (id, membershipId, customerPriceAdjustments) => {
  const customerAdjustment = customerPriceAdjustments.find(a =>
    a.linked_product_id === id && a._metadata.membership_id === membershipId);

  return customerAdjustment && customerAdjustment.type === 'value_override';
};

module.exports = (query, customerId, date) => {
  if (!customerId) {
    return getSearchResults(query);
  }

  return Promise.all([
    getCustomerMemberships(customerId),
    getCustomerPriceAdjustments(customerId, date),
    getSearchResults(query)
  ])
  .then(_.spread((customerMemberships, customerPriceAdjustments, searchResults) => {
    const withoutOverrideResults = searchResults.hits.filter(hit => {
      const membership = customerMemberships.find(m => m.supplier_id === hit.supplier_id);
      return membership ? !productHasCustomerOverride(hit.objectID, membership.id, customerPriceAdjustments) : false;
    });

    const groupAdjustmentsForProducts = [];

    _.forOwn(_.groupBy(withoutOverrideResults, 'supplier_id'), (results, supplierId) => {
      const membership = customerMemberships.find(m => m.supplier_id === supplierId);

      if (membership) {
        groupAdjustmentsForProducts.push(
          getGroupAdjustmentsForProducts(membership.price_adjustment_group_id, supplierId, date, results.map(r => r.objectID)));
      }
    });

    return Promise.all(groupAdjustmentsForProducts)
      .then(groupAdjustments => [searchResults, customerPriceAdjustments, customerMemberships, _.flatten(groupAdjustments)]);
  }))
  .then(_.spread((searchResults, customerPriceAdjustments, customerMemberships, groupAdjustments) => {
    return searchResults.hits.map(hit => {
      const basePrice = hit.price;
      const membership = customerMemberships.find(m => m.supplier_id === hit.supplier_id);
      const customerAdjustment = membership ? customerPriceAdjustments.find(a => a.linked_product_id === hit.objectID && a._metadata.membership_id === membership.id) : undefined;
      const groupAdjustment = membership ? groupAdjustments.find(a => a._metadata.linked_product_id === hit.objectID && a.price_adjustment_group_id === membership.price_adjustment_group_id) : undefined;

      return Object.assign({}, hit, {price: calculatePrice(basePrice, customerAdjustment, groupAdjustment)});
    });
  }))
  .then(results => Promise.resolve({hits: results}));
};

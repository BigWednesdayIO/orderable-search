'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const nock = require('nock');

const uris = require('../lib/uris');
const searchProxy = require('../lib/search_proxy');

const stubbedSearchResults = {
  hits: [
    {objectID: 'noadjustment', price: 12.99, supplier_id: '1'},
    {objectID: 'customeroverriden', price: 10, supplier_id: '1'},
    {objectID: 'groupoverriden', price: 20, supplier_id: '2'},
    {objectID: 'customervalueadjusted', price: 5, supplier_id: '1'},
    {objectID: 'customerpercentageadjusted', price: 100, supplier_id: '1'},
    {objectID: 'groupvalueadjusted', price: 85, supplier_id: '2'},
    {objectID: 'grouppercentageadjusted', price: 40, supplier_id: '2'},
    {objectID: 'combinedadjustments', price: 12, supplier_id: '3'}
  ]
};

describe('Search proxy', () => {
  let proxyResults;
  const testDate = new Date();

  before(() => {
    nock(uris.search, {reqHeaders: {authorization: `Bearer ${process.env.SEARCH_API_TOKEN}`, host: () => true}})
      .persist()
      .post('/indexes/orderable-products/query')
      .reply(200, (uri, body) => {
        if (JSON.parse(body).query === 'test') {
          return stubbedSearchResults;
        }

        return {hits: []};
      });

    nock(uris.customers, {reqHeaders: {authorization: process.env.BIGWEDNESDAY_JWT}})
      .get(`/customers/1/product_price_adjustments?date=${testDate.toISOString()}`)
      .reply(200, [
        {linked_product_id: 'customeroverriden', type: 'value_override', amount: 30.10},
        {linked_product_id: 'customervalueadjusted', type: 'value_adjustment', amount: -0.50},
        {linked_product_id: 'customerpercentageadjusted', type: 'percentage_adjustment', amount: 90},
        {linked_product_id: 'combinedadjustments', type: 'value_adjustment', amount: -5}
      ])
      .get('/customers/1/memberships')
      .reply(200, [
        {supplier_id: '2', price_adjustment_group_id: 'group1'},
        {supplier_id: '3', price_adjustment_group_id: 'group2'}
      ]);

    nock(uris.suppliers, {reqHeaders: {authorization: process.env.BIGWEDNESDAY_JWT}})
      .get('/suppliers/1/price_adjustments')
      .query(true)
      .reply(200, [])
      .get(`/suppliers/2/price_adjustments?price_adjustment_group_id=group1&date=${testDate.toISOString()}&product_id[]=groupoverriden&product_id[]=groupvalueadjusted&product_id[]=grouppercentageadjusted`)
      .reply(200, [
        {price_adjustment_group_id: 'group1', linked_product_id: 'groupoverriden', type: 'value_override', amount: 15.00},
        {price_adjustment_group_id: 'group1', linked_product_id: 'groupvalueadjusted', type: 'value_adjustment', amount: 1},
        {price_adjustment_group_id: 'group1', linked_product_id: 'grouppercentageadjusted', type: 'percentage_adjustment', amount: 125}
      ])
      .get(`/suppliers/3/price_adjustments?price_adjustment_group_id=group2&date=${testDate.toISOString()}&product_id[]=combinedadjustments`)
      .reply(200, [
        {price_adjustment_group_id: 'group2', linked_product_id: 'combinedadjustments', type: 'value_override', amount: 15}
      ]);

    return searchProxy(new Buffer('{"query": "test"}'), 1, testDate)
      .then(results => proxyResults = results);
  });

  after(() => nock.cleanAll());

  it('returns results from search api', () =>
    expect(proxyResults.hits.map(hit => _.omit(hit, 'price'))).to.deep.equal(stubbedSearchResults.hits.map(hit => _.omit(hit, 'price'))));

  it('sets the default price when there are no adjustments', () =>
    expect(proxyResults.hits[0]).to.have.property('price', stubbedSearchResults.hits[0].price));

  it('sets value_override amount as price for the customer', () =>
    expect(proxyResults.hits[1]).to.have.property('price', 30.10));

  it('sets value_override amount as price for the customer\'s price adjustment group', () =>
    expect(proxyResults.hits[2]).to.have.property('price', 15.00));

  it('adjusts price by value_adjustment amount for the customer', () =>
    expect(proxyResults.hits[3]).to.have.property('price', 4.50));

  it('adjusts price by percentage_adjustment amount for the customer', () =>
    expect(proxyResults.hits[4]).to.have.property('price', 90.00));

  it('adjusts price by value_adjustment amount for the customer\'s price adjustment group', () =>
    expect(proxyResults.hits[5]).to.have.property('price', 86.00));

  it('adjusts price by percentage_adjustment amount for the customer\'s price adjustment group', () =>
    expect(proxyResults.hits[6]).to.have.property('price', 50.00));

  it('applies customer adjustments to group adjustments', () =>
    expect(proxyResults.hits[7]).to.have.property('price', 10));

  it('uses the default search result when there is no identified customer', () =>
    searchProxy(new Buffer('{"query": "test"}'), undefined, testDate)
      .then(results => expect(results).to.deep.equal(stubbedSearchResults)));
});

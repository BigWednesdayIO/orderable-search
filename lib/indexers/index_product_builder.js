'use strict';

const _ = require('lodash');

const extractLinkedProductData = linkedProductData => _.pick(linkedProductData, 'supplier_id', 'price', 'was_price');

const extractCategoryData = productData => ({
  category_id: _.get(productData, 'category.id'),
  category_name: _.get(productData, 'category.name'),
  category_hierarchy: _.get(productData, 'category._metadata.hierarchy')
});

const extractProductTypeAttributes = productData =>
  (productData.product_type_attributes || []).reduce((o, attribute) => {
    o[attribute.name] = attribute.values;
    return o;
  }, {});

module.exports.build = (linkedProductData, productData) =>
  Object.assign(extractLinkedProductData(linkedProductData),
    extractCategoryData(productData),
    extractProductTypeAttributes(productData),
    {created: _.get(productData, '_metadata.created')},
    _.omit(productData, 'category', 'product_type_attributes', '_metadata'));

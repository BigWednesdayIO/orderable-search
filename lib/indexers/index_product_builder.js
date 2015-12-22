'use strict';

const _ = require('lodash');

const extractProductTypeAttributes = productData =>
  (productData.product_type_attributes || []).reduce((o, attribute) => {
    o[attribute.name] = attribute.values;
    return o;
  }, {});

module.exports.build = (linkedProductData, productData) =>
  Object.assign({
    supplier_id: linkedProductData.supplier_id,
    price: linkedProductData.price,
    was_price: linkedProductData.was_price,
    category_id: _.get(productData, 'category.id'),
    category_name: _.get(productData, 'category.name'),
    category_hierarchy: _.get(productData, 'category._metadata.hierarchy')
  }, extractProductTypeAttributes(productData), _.omit(productData, 'category', 'product_type_attributes'));

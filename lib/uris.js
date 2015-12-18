'use strict';

module.exports.search = `http://${process.env.SEARCH_API_SVC_SERVICE_HOST}:${process.env.SEARCH_API_SVC_SERVICE_PORT}`;
module.exports.products = `http://${process.env.PRODUCTS_API_SVC_SERVICE_HOST}:${process.env.PRODUCTS_API_SVC_SERVICE_PORT}`;
module.exports.suppliers = `http://${process.env.SUPPLIERS_API_SVC_SERVICE_HOST}:${process.env.SUPPLIERS_API_SVC_SERVICE_PORT}`;

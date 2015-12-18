'use strict';

require('./server')((err, server) => {
  if (err) {
    return console.error(err);
  }

  server.start(err => {
    if (err) {
      return console.error(err);
    }

    console.log('Server listening on port', server.info.port);
  });
});

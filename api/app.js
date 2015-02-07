 var sails = require('sails');

 sails
     .lift({ // configuration for testing purposes
         port: 7070,
         environment: 'test',
         log: {
             noShip: false
         },
         models: {
             migrate: 'drop'
         },
         hooks: {
             sockets: false,
             pubsub: false,
             grunt: false //we dont need grunt in test
         }
     }, function(error, sails) {
         if (error) {
             return done(error);
         }
     });
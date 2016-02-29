sails-hook-subscriber
====================

[![Build Status](https://travis-ci.org/lykmapipo/sails-hook-subscriber.svg?branch=master)](https://travis-ci.org/lykmapipo/sails-hook-subscriber)

Kue based job subscriber(consumer and workers pool) for sails v0.11.0+. Its a wrapper around [Kue](https://github.com/learnboost/kue) for processing published jobs by using [redis](https://github.com/antirez/redis) as a queue engine.

*Warning: v1.0.0 upgrade to use kue v0.9.4 and cause API break on define worker perfom function. Now `context` is a second parameter and `done callback` is the last parameter*

## Installation
```js
$ npm install --save sails-hook-subscriber
```

## Usage
In the `api/workers` directory create your `worker definitions` based on `job type` the `worker` will have to process(perform). Example, a worker for `job type` email will be defined in the file `api/workers/EmailWorker.js`. 

The worker definition must define 
- `perform(job, context, done)` perform function which accept `job` to process, `context` which is the [worker context](https://github.com/learnboost/kue#pause-processing) and `done` a callback to be called once job processing is done. 
- `concurrency` attribute which controll the [concurrency](https://github.com/learnboost/kue#processing-concurrency) of jobs it process. 

A sample `worker definition` is as below:

```js
//in api/workers/EmailWorker.js
/**
 * @description a worker to perform `email` job type
 * @type {Object}
 */
var async = require('async');
module.exports = {
    //specify worker
    //job concurrency
    concurrency: 2,

    //perform sending email
    //job
    perform: function(job, context,  done) {
        var email = job.data.to;

        //send email

        //update sails model
        async
            .waterfall(
                [
                    function(next) {
                        //send email codes here
                        next(null, {
                            sentAt: new Date(),
                            status: 'Ok'
                        });
                    },
                    function(deliveryStatus, next) {
                        User
                            .findOneByEmail(email)
                            .exec(function(error, user) {
                                if (error) {
                                    next(error);
                                } else {
                                    user.emailSentAt = deliveryStatus.sentAt
                                    next(null, user, deliveryStatus);
                                }
                            });
                    },
                    function(user, deliveryStatus, next) {
                        user.save(function(error, user) {
                            if (error) {
                                next(error);
                            } else {
                                next(null, user, deliveryStatus);
                            }
                        });
                    }
                ],
                function(error, user, deliveryStatus) {
                    if (error) {
                        done(error);
                    } else {
                        done(null, deliveryStatus);
                    }
                });
    }

};
``` 
Thats all you are supposed to do and `sails-hook-subscriber` will do the heavy lifting to setup `kue` and use  `workers` to process jobs whenever they are available in the `queue`.

## Configuration
`sails-hook-subscriber` accept application defined configuration by utilizing sails configuration api. In sails `config` directory add `config/subscriber.js` and you will be able to override all the defauts configurations.

Simply, copy the below and add it to your `config/subscriber.js`
```js
module.exports.subscriber = {
    //default key prefix for kue in
    //redis server
    prefix: 'q',

    //control activeness of subscribe
    //its active by default
    active:true,

    //default redis configuration
    redis: {
        //default redis server port
        port: 6379,
        //default redis server host
        host: '127.0.0.1'
    },
    //number of milliseconds
    //to wait for workers to 
    //finish their current active job(s)
    //before shutdown
    shutdownDelay: 5000,
    //number of millisecond to
    //wait until promoting delayed jobs
    promotionDelay: 5000,
    //number of delated jobs
    //to be promoted
    promotionLimit: 200,
    
    //prefix to add to job types
    jobTypePrefix: '',
    //prefix to add to uppercase letters in the job type (except first uppercase letter)
    jobTypePrefixUppercase: ''
}
```


## Testing

* Clone this repository

* Install all development dependencies

```sh
$ npm install
```
* Then run test

```sh
$ npm test
```

**Note**: If you don't have `grunt-cli` installed, the tests may not run correctly. Install `grunt-cli` globally with `npm install -g grunt-cli`

## Contribute

Fork this repo and push in your ideas. 
Do not forget to add a bit of test(s) of what value you adding.

## Licence

Copyright (c) 2015 lykmapipo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
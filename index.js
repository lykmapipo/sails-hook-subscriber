/**
 * @description Kue based job subscriber(consumer and workers pool) for sails.
 *              It loads all worker defined at `api/workers` and bind them to
 *              kue instance ready to perform jobs.

 * @param  {Object} sails a sails application
 * @return {Object} sails-hook-subscriber which follow installable sails-hook spec
 */
module.exports = function(sails) {
    var kue = require('kue');
    var _ = require('lodash');

    //reference kue based queue
    var subscriber;

    //return hook
    return {

        //Defaults configurations
        defaults: {
            // default key prefix for kue in
            // redis server
            prefix: 'q',

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
            promotionLimit: 200
        },

        //expose this hook kue worker pool
        //Warning!: aim of this queue is to only
        //process jobs, if you want to publish jobs
        //consider using `https://github.com/lykmapipo/sails-hook-publisher`
        workerPool: subscriber,

        //Runs automatically when the hook initializes
        initialize: function(done) {
            //reference this hook
            var hook = this;

            //extend defaults configuration
            //with provided configuration from sails
            //config
            var config =
                _.extend(hook.defaults, sails.config.subscriber);

            // Lets wait on some of the sails core hooks to
            // finish loading before 
            // load `sails-hook-subscriber`
            var eventsToWaitFor = [];

            if (sails.hooks.orm) {
                eventsToWaitFor.push('hook:orm:loaded');
            }

            if (sails.hooks.pubsub) {
                eventsToWaitFor.push('hook:pubsub:loaded');
            }

            sails
                .after(eventsToWaitFor, function() {
                    //initialize subscriber
                    subscriber = kue.createQueue(config);

                    //initialize workers
                    initializeWorkers();

                    //attach workerPool
                    hook.workerPool = subscriber;

                    //promote delayed jobs
                    //TODO what if sails started in clustering mode?
                    subscriber
                        .promote(
                            config.promotionDelay,
                            config.promotionLimit
                        );

                    //shutdown kue subscriber
                    //and wait for time equla to `shutdownDelay` 
                    //for workers to finalize their jobs
                    function shutdown() {
                        subscriber
                            .shutdown(function(error) {
                                sails.emit('subscribe:shutdown', error || '');

                            }, config.shutdownDelay);
                    };

                    //gracefully shutdown
                    //subscriber
                    sails.on("lower", shutdown);
                    sails.on("lowering", shutdown);

                    //tell external world we are up
                    //and running
                    sails.on('lifted', function() {
                        sails.log('sails-hook-subscriber loaded successfully');
                    });

                    // finalize subscriber setup
                    done();
                });
        }
    };

    function initializeWorkers() {
        //find all workers
        //defined at `api/workers`
        var workers = require('include-all')({
            dirname: sails.config.appPath + '/api/workers',
            filter: /(.+Worker)\.js$/,
            excludeDirs: /^\.(git|svn)$/,
            optional: true
        });

        //attach all workers to queue
        //ready to process their jobs
        _.keys(workers).forEach(function(worker) {
            //deduce job type form worker name
            var jobType = worker.split('W')[0].toLowerCase();

            //grab worker definition from
            //loaded workers
            var workerDefinition = workers[worker];

            //tell subscriber about the 
            //worker definition
            //and register if 
            //ready to perform available jobs
            subscriber
                .process(
                    jobType,
                    workerDefinition.concurrency || 1,
                    workerDefinition.perform
                );
        });
    };

};
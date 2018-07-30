'use strict';

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

    /**
     * Determines the job type of a worker.
     *
     * @param {string} worker Filename (without .js suffix) of worker
     * @param {object} config Configuration object for this hook
     * @returns {string}
     */
    function getJobType(worker, config) {
        var jobType = config.jobTypePrefix + worker.replace(/Worker$/, '');

        // Prefix all uppercase letters (except the first one)
        if (config.jobTypePrefixUppercase) {
            // Convert first letter to lowercase, so that doesn't get prefixed.
            jobType = jobType
                    .replace(/([a-z\d])([A-Z])/g, '$1' + config.jobTypePrefixUppercase + '$2');
        }
        // Convert job type entirely to lowercase
        jobType = jobType.toLowerCase();

        return jobType;
    }

    //workers loader
    function initializeWorkers(config) {
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
            // deduce job type form worker name (add prefix)
            var jobType = getJobType(worker, config);

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
    }
    /**
     * Retrieve the default hooks configs with any other global redis config
     */
    function getDefaultConfig() {
      //get extended default config
      var config = sails.config[this.configKey] || {};
      // extend any custom redis configs based on specific global env config
      if (sails.config.redis) {
        config = Object.assign(config, {'redis':Object.assign(config.redis, sails.config.redis)});
      }
  
      return config;
    }

    //reference kue based queue
    var subscriber;

    //return hook
    return {

        //Defaults configurations
        defaults: {

            __configKey__: {
                //control activeness of subscribe
                //its active by default
                active: true,

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
                promotionLimit: 200,

                //prefix to add to job types
                jobTypePrefix: '',
                //prefix to add to uppercase letters in the job type (except first uppercase letter)
                jobTypePrefixUppercase: ''
            }

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

            //get extended config
            var config = getDefaultConfig.call(this);

            // Lets wait on some of the sails core hooks to
            // finish loading before 
            // load `sails-hook-subscriber`
            var eventsToWaitFor = [];

            // If the hook has been deactivated, just return
            if (!config.active) {
                sails.log.info('sails-hooks-subscriber deactivated.');
                return done();
            }

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
                    initializeWorkers(config);

                    //attach workerPool
                    hook.workerPool = subscriber;


                    //shutdown kue subscriber
                    //and wait for time equla to `shutdownDelay` 
                    //for workers to finalize their jobs
                    function shutdown() {
                        subscriber
                            .shutdown(config.shutdownDelay, function(error) {
                                sails.emit('subscribe:shutdown', error || '');
                            });
                    }

                    //gracefully shutdown
                    //subscriber
                    sails.on('lower', shutdown);
                    sails.on('lowering', shutdown);

                    //tell external world we are up
                    //and running
                    sails.on('lifted', function() {
                        sails.log('sails-hook-subscriber loaded successfully');
                    });

                    // finalize subscriber setup
                    done();
                });
        },

        reload: function(done) {
            sails.log.info('Reloading sails-hook-subscriber.');
            done = done || function(){};
            //get extended config
            var config = getDefaultConfig.call(this);

            subscriber.workers = [];

            initializeWorkers(config);

            done();
        }
    };

};
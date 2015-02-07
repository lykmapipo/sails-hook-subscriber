/**
 * @description a worker to perform `email` job type
 * @type {Object}
 */
var async = require('async');
module.exports = {
    //worker concurrency
    concurrency: 2,

    //sending emails
    //note!: we have access of
    //of all of sails
    perform: function(job, done, context) {
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
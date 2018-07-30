'use strict';

var expect = require('chai').expect;
var kue = require('kue');
var faker = require('faker');

var email = faker.internet.email();

describe('Hook#subscriber', function() {

    it('should be loaded as installable hook', function(done) {
        expect(sails.hooks.subscriber).to.not.be.null;
        done();
    });

    it('should have defaults configuration', function(done) {
        expect(sails.config.subscriber).to.not.be.null;
        expect(sails.config.subscriber.prefix).to.equal('q');
        expect(sails.config.subscriber.redis.port).to.equal(6379);
        expect(sails.config.subscriber.redis.host).to.equal('127.0.0.1');
        expect(sails.config.subscriber.jobTypePrefix).to.equal('');
        expect(sails.config.subscriber.jobTypePrefixUppercase).to.equal('');

        done();
    });

    it('should be able to use redis config from global sails.config', function(done) {
      expect(sails.config.subscriber.redis.host).to.equal(sails.config.redis.host);
      done();
    });

    it('should be active per default', function(done) {
        expect(sails.config.subscriber.active).to.be.true;

        done();
    });

    it('should have a workerPool to process jobs', function(done) {
        var subscriber = sails.hooks.subscriber;

        expect(subscriber.workerPool).to.not.be.null;

        done();
    });


    it('should be able to process jobs published to it', function(done) {
        var publisher = kue.createQueue();

        User
            .create({
                    username: faker.internet.userName(),
                    email: email
                },
                function(error, user) {
                    if (error) {
                        done(error);
                    } else {
                        publisher
                            .create('email', {
                                title: 'welcome ' + user.username,
                                to: user.email,
                                message: 'welcome !!'
                            })
                            .on('complete', function(deliveryStatus) {
                                expect(deliveryStatus.sentAt).to.not.be.null;
                                expect(deliveryStatus.status).to.not.be.null;
                                done();
                            })
                            .save(function(error) {
                                if (error) {
                                    done(error);
                                }
                            });
                    }
                });
    });

    it('should be able to process jobs published to workers having `w` in their names', function(done) {
        var publisher = kue.createQueue();

        User
            .create({
                    username: faker.internet.userName(),
                    email: email
                },
                function(error, user) {
                    if (error) {
                        done(error);
                    } else {
                        publisher
                            .create('waterlock', {
                                title: 'welcome ' + user.username,
                                to: user.email,
                                message: 'welcome !!'
                            })
                            .on('complete', function(deliveryStatus) {
                                expect(deliveryStatus.sentAt).to.not.be.null;
                                expect(deliveryStatus.status).to.not.be.null;
                                done();
                            })
                            .save(function(error) {
                                if (error) {
                                    done(error);
                                }
                            });
                    }
                });
    });

    it('should correctly register a job type with a prefix if specified', function(done) {
        var jobTypePrefix = 'prefix.';

        // Set a prefix and reload
        sails.config.subscriber.jobTypePrefix = jobTypePrefix;
        sails.hooks.subscriber.reload(function(err) {
            if (err) {
                return done(err);
            }
            User
                .create({
                    username: faker.internet.userName(),
                    email: email
                },
                function(error, user) {
                    if (error) {
                        done(error);
                    } else {
                      var publisher = kue.createQueue();
                        var jobType = jobTypePrefix + 'email';
                        publisher
                            .create(jobType, {
                                title: 'welcome ' + user.username,
                                to: user.email,
                                message: 'welcome !!'
                            })
                            .on('complete', function(deliveryStatus) {
                                expect(deliveryStatus.sentAt).to.not.be.null;
                                expect(deliveryStatus.status).to.not.be.null;

                                // Reset the prefix and reload
                                sails.config.subscriber.jobTypePrefix = '';
                                sails.hooks.subscriber.reload(function(err) {
                                    done(err);
                                });
                            })
                            .save(function(error) {
                                if (error) {
                                    done(error);
                                }
                            });
                    }
                });

        });
    });

    it('should correctly be able to add prefixes to uppercase letters in the job type', function(done) {
      // Set a prefix and reload
      sails.config.subscriber.jobTypePrefixUppercase = '.';
      sails.hooks.subscriber.reload(function(err) {
        if (err) {
          return done(err);
        }

        var publisher = kue.createQueue();
        var jobType = 'multiple.words';
        publisher
          .create(jobType)
          .on('complete', function() {

            // Reset the prefix and reload
            sails.config.subscriber.jobTypePrefixUppercase = '';
            sails.hooks.subscriber.reload(function(err) {
              done(err);
            });
          })
          .save(function(error) {
            if (error) {
              done(error);
            }
          });

      });
    });


});
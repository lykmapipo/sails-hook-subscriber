var expect = require('chai').expect;
var kue = require('kue');
var faker = require('faker');
var async = require('async');

var email = faker.internet.email();

describe('Hook#subscriber', function() {

    it('should be loaded as installable hook', function(done) {
        expect(sails.hooks.subscriber).to.not.be.null;
        done();
    });

    it('should have defaults configuration', function(done) {
        var subscriber = sails.hooks.subscriber;

        expect(subscriber.defaults).to.not.be.null;
        expect(subscriber.defaults.prefix).to.equal('q');
        expect(subscriber.defaults.redis.port).to.equal(6379);
        expect(subscriber.defaults.redis.host).to.equal('127.0.0.1');

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
                        var job = publisher
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

});
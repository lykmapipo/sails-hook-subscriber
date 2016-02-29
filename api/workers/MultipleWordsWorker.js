/**
 * @description a worker whose filename contains multiple words (besides 'Worker')
 * @type {Object}
 */
module.exports = {
    perform: function(job, context, done) {
        // Just return in the next tick
        setTimeout(done);
    }

};
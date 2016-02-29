module.exports.subscriber = {
    //default key prefix for kue in
    //redis server
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
    shutdownDelay: 6000,
    //number of millisecond to
    //wait until promoting delayed jobs
    promotionDelay: 6000,
    //number of delated jobs
    //to be promoted
    promotionLimit: 300,

    //prefix to add to job types
    jobTypePrefix: '',

    //prefix to add to uppercase letters in the job type (except first uppercase letter)
    jobTypePrefixUppercase: ''
}

var util      = require('util'),
    common    = require('./common'),
    JobServer = require('./job-server').JobServer;


/**
 * This class represents a mixin for Client and/or Worker
 * which adds functionality for manipulation with multiple job servers.
 *
 * (C) 2013 Vaclav Sykora
 * Apache License, Version 2.0, http://www.apache.org/licenses/
 *
 */
var ServerManager = exports.ServerManager = function () {};


/**
 * *options*
 *    *host - hostname of single job server
 *    *port - port of single job server
 *    *servers - array of host,port pairs of multiple job servers
 */
ServerManager.prototype.initServers = function (options) {
    var pattern, returned, jobServer;

    if (!this.hasOwnProperty('_type')) { return new Error('this object is neither Client nor Worker'); }

    options = options || {};
    clonedOptions = common.clone(options);

    // VALIDATION
    pattern = { host: 'localhost', port: 4730, servers: 'optional' }
    returned = common.verifyAndSanitizeOptions(clonedOptions, pattern);
    if (returned instanceof Error) { return returned; }

    if (clonedOptions.hasOwnProperty('servers')) {
        if (!util.isArray(clonedOptions.servers)) {
            return new Error('servers: not an array');
        }
        if (clonedOptions.servers.length === 0) {
            return new Error('servers: empty array');
        }
    } else { // fake servers if only single server given
        clonedOptions.servers = [{ host: clonedOptions.host, port: clonedOptions.port }];
    }

    this.jobServers = [];

    // iterate server definitions and instantiate JobServer
    pattern = { host: 'localhost', port: 4730 };
    for (var i = 0; i < clonedOptions.servers.length; i ++) {
        common.verifyAndSanitizeOptions(clonedOptions.servers[i], pattern);
        jobServer = new JobServer(clonedOptions.servers[i]);

        // assert whether no duplicate server
        if (!this.jobServers.every(function(el) { return el.getUid() != jobServer.getUid(); })) {
            return new Error('duplicate server, uid=' + jobServer.getUid());
        }
        // only paranoia
        if (jobServer instanceof Error) { return jobServer; }

        jobServer.clientOrWorker = this; // bidirectional association management

        this.jobServers.push(jobServer);
    }
}


/**
 * Cleanly ends associated job servers.
 */
ServerManager.prototype.closeServers = function () {
    for (var i = 0; i < this.jobServers.length; i ++) {
        this.jobServers[i].disconnect();
    }
}


/**
 * Gets a JobServer object according to given UID or 'undefined' if not found.
 */
ServerManager.prototype._getJobServerByUid = function (uid) { // #unit: not needed
    var i;
    for (i = 0; i < this.jobServers.length; i ++) {
        if (uid === this.jobServers[i].getUid()) {
            return this.jobServers[i];
        }
    }
    return undefined;
}


/**
 * Mixin - augment the target constructor with the ServerManager functions.
 */
ServerManager.mixin = function (destinationCtor) {
    common.mixin(ServerManager.prototype, destinationCtor.prototype);
}
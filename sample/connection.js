'use strict';

var memorydb = require('../lib');
var Q = require('q');
var should = require('should');

// For distributed system, just run memorydb in each server (Each instance is a shard).

var main = function(){

	// memorydb's config
	var config = {
		//shard Id (Must unique and immutable for each server)
		shard : 'shard1',
		// Center backend storage, must be same for all shards
		backend : {engine : 'mongodb', url : 'mongodb://localhost/memorydb-test'},
		// Used for backendLock, must be same for all shards
		redis : {host : '127.0.0.1', port : 6379},
		// Redis data replication (for current shard)
		slave : {host : '127.0.0.1', port : 6379},
	};

	var player = {_id : 'p1', name : 'rain', level : 1};

	var conn = null;

	return Q.fcall(function(){
		// Start memorydb
		return memorydb.startServer(config);
	})
	.then(function(){
		// Create a new connection
		return memorydb.connect();
	})
	.then(function(ret){
		conn = ret;
		// Insert a doc to collection 'player'
		return conn.collection('player').insert(player._id, player);
	})
	.then(function(){
		// Find the doc
		return conn.collection('player').find(player._id)
		.then(function(ret){
			ret.should.eql(player);
		});
	})
	.then(function(){
		// Commit changes
		return conn.commit();
	})
	.then(function(){
		// Update a field
		return conn.collection('player').update(player._id, {level : 2});
	})
	.then(function(){
		// Find the doc (only return specified field)
		return conn.collection('player').find(player._id, 'level')
		.then(function(ret){
			ret.level.should.eql(2);
		});
	})
	.then(function(){
		// Roll back changes
		return conn.rollback();
	})
	.then(function(){
		// Doc should rolled back
		return conn.collection('player').find(player._id, 'level')
		.then(function(ret){
			ret.level.should.eql(1);
		});
	})
	.then(function(){
		// Remove doc
		return conn.collection('player').remove(player._id);
	})
	.then(function(){
		// Commit changes
		return conn.commit();
	})
	.then(function(){
		// Doc should not exist
		return conn.collection('player').find(player._id)
		.then(function(ret){
			(ret === null).should.eql(true);
		});
	})
	.then(function(){
		// Close connection
		return conn.close();
	})
	.fin(function(){
		// Stop memorydb
		return memorydb.stopServer();
	});
};

if (require.main === module) {
	return Q.fcall(function(){
		return main();
	})
	.fin(function(){
		process.exit();
	});
}

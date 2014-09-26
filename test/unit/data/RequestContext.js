'use strict';

var rewire = require('rewire');
var RC = rewire('data/RequestContext');
var persMock = require('../../mock/pers');


suite('RequestContext', function() {

	setup(function() {
		RC.__set__('pers', persMock);
		persMock.reset();
	});
	
	teardown(function() {
		RC.__set__('pers', rewire('data/pers'));
	});
	
	
	suite('getContext', function() {
		
		test('fails when called outside a request context', function() {
			assert.throw(function() {
				RC.getContext();
			}, assert.AssertionError);
		});
		
		test('does its job', function(done) {
			new RC('testlogtag').run(function() {
				var ctx = RC.getContext();
				assert.isDefined(ctx);
				assert.strictEqual(ctx.logtag, 'testlogtag');
				done();
			});
		});
	});
	
	
	suite('run', function() {
	
		test('initializes request data structures', function(done) {
			new RC().run(function() {
				var ctx = RC.getContext();
				assert.property(ctx, 'cache');
				assert.deepEqual(ctx.cache, {});
				assert.property(ctx, 'dirty');
				assert.deepEqual(ctx.dirty, {});
				done();
			});
		});
		
		test('persists dirty objects after request is finished', function(done) {
			new RC('', '').run(function() {
				var rc = RC.getContext();
				rc.setDirty({tsid: 'IA'});
				rc.setDirty({tsid: 'IB', deleted: true});
				assert.deepEqual(Object.keys(RC.getContext().dirty), ['IA', 'IB']);
				assert.deepEqual(persMock.getDirtyList(), {});  // request in progress, list not processed yet
			},
			function callback() {
				assert.deepEqual(persMock.getDirtyList(), {
					IA: {tsid: 'IA'},
					IB: {tsid: 'IB', deleted: true},
				});
				done();
			});
		});
		
		test('runs request function and returns its return value in callback', function(done) {
			var derp = 1;
			new RC('', '').run(function() {
				derp = 3;
				return 'hooray';
			},
			function callback(err, res) {
				assert.strictEqual(derp, 3);
				assert.strictEqual(res, 'hooray');
				done();
			});
		});
		
		test('passes errors thrown by the request function back in callback', function(done) {
			new RC('', '').run(function() {
				throw new Error('meh');
			},
			function callback(err, res) {
				assert.isDefined(err);
				assert.strictEqual(err.message, 'meh');
				done();
			});
		});
	});
});
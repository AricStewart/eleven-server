var path = require('path');
var rewire = require('rewire');
var pers = rewire('data/pers');
var gsjsBridge = require('model/gsjsBridge');
var GameObject = require('model/GameObject');
var Item = require('model/Item');
var pbeMock = require('../../mock/pbe');
var rpcMock = require('../../mock/rpc');
var rcMock = require('../../mock/requestContext');


suite('pers', function() {

	var FIXTURES_PATH = path.resolve(path.join(__dirname, '../fixtures'));
	
	this.timeout(5000);
	this.slow(1000);
	
	suiteSetup(function() {
		// initialize gsjsBridge data structures (empty) without loading all the prototypes
		gsjsBridge.reset();
	});
	
	suiteTeardown(function() {
		// reset gsjsBridge so the cached prototypes don't influence other tests
		gsjsBridge.reset();
	});
	
	setup(function() {
		pers.__set__('rpc', rpcMock);
		pers.__set__('reqContext', rcMock);
		pers.init(pbeMock);
		pbeMock.init(FIXTURES_PATH);
		rcMock.reset();
	});
	
	teardown(function() {
		pers.__set__('rpc', require('data/rpc'));
		pers.__set__('reqContext', require('data/requestContext'));
		pers.init(undefined);  // disable mock back-end
		rcMock.reset();
	});
	

	suite('game object loading', function() {
		
		test('loaded game objects are initialized correctly', function() {
			var o = pers.get('IHFK8C8NB6J2FJ5');
			assert.instanceOf(o, Item);
			assert.instanceOf(o, GameObject);
			assert.strictEqual(o.constructor.name, o.class_tsid);
			assert.property(o, 'distributeQuoinShards', 'quoin-specific property');
			assert.property(o, 'distanceFromPlayer', 'property from item.js');
		});
	});
});
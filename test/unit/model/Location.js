'use strict';

var Location = require('model/Location');
var Geo = require('model/Geo');
var Item = require('model/Item');
var Bag = require('model/Bag');
var Player = require('model/Player');
var pers = require('data/pers');
var pbeMock = require('../../mock/pbe');


suite('Location', function () {

	function getDummyGeo() {
		// blank dummy object to prevent Location from trying to retrieve
		// geometry from persistence
		return new Geo();
	}


	suite('ctor', function () {

		test('initializes core properties', function () {
			var l = new Location({}, getDummyGeo());
			assert.deepEqual(l.players, {});
			assert.deepEqual(l.activePlayers, {});
			assert.deepEqual(l.items, {});
		});

		test('converts players and items lists to IdObjRefMaps', function () {
			var l = new Location({
				players: [
					{tsid: 'PX'},
					{tsid: 'PY'},
				],
				items: [
					{tsid: 'IA'},
					{tsid: 'IB'},
					{tsid: 'IC'},
				],
			}, getDummyGeo());
			assert.strictEqual(l.players.length, 2);
			assert.strictEqual(l.items.length, 3);
		});
	});


	suite('updateGeo', function () {

		setup(function () {
			pers.init(pbeMock);
		});

		teardown(function () {
			pers.init();  // disable mock back-end
		});

		test('does its job', function () {
			var l = new Location({}, new Geo({layers: {middleground: {doors: {}}}}));
			l.geometry.layers.middleground.doors.d = {
				connect: {target: {label: 'uranus', tsid: 'LABC'}},
			};
			l.geometry.l = -1234;
			l.updateGeo();
			var doors = l.geometry.layers.middleground.doors;
			assert.strictEqual(doors.d.connect.label, 'uranus');
			assert.strictEqual(doors.d.connect.street_tsid, 'LABC');
			assert.typeOf(doors.d.connect.target, 'object');
			assert.isFalse(doors.d.connect.propertyIsEnumerable('target'));
			assert.strictEqual(
				l.clientGeometry.layers.middleground.doors.d.connect.street_tsid,
				'LABC');
			assert.strictEqual(l.geo.doors.d.connect.street_tsid, 'LABC');
			assert.strictEqual(l.geo.l, -1234);
			// check that removing stuff also works:
			delete l.geometry.layers.middleground.doors.d;
			l.updateGeo();
			assert.notProperty(l.clientGeometry.layers.middleground.doors, 'd');
			assert.notProperty(l.geo.doors, 'd');
		});
	});


	suite('del', function () {

		test('works as expected', function () {
			var i = new Item({tsid: 'I1'});
			var b = new Bag({tsid: 'B1', items: [i]});
			i.container = b;
			var l = new Location({items: [b]}, new Geo());
			b.container = l;
			l.del();
			assert.isTrue(l.deleted);
			assert.isTrue(l.geometry.deleted);
			assert.isTrue(b.deleted);
			assert.isTrue(i.deleted);
		});

		test('fails if there are players in the location', function () {
			var p = new Player();
			var l = new Location({players: [p]}, new Geo());
			assert.throw(function () {
				l.del();
			}, assert.AssertionError);
		});
	});


	suite('queueAnnc', function () {

		test('works as expected', function () {
			var p1 = new Player();
			var p2 = new Player();
			var l = new Location({players: [p1]}, new Geo());
			l.queueAnnc({gargle: 'marbles'});
			assert.deepEqual(p1.anncs, [{gargle: 'marbles'}]);
			assert.deepEqual(p2.anncs, [], 'not queued for p2 (not in this loc)');
		});
	});


	suite('send', function () {

		function dummyPlayer(tsid, results) {
			var p = new Player({tsid: tsid});
			p.send = function () {
				results.push(p.tsid);
			};
			return p;
		}

		test('works as expected', function () {
			var res = [];
			var l = new Location({players: [
				dummyPlayer('P1', res),
				dummyPlayer('P2', res),
				dummyPlayer('P3', res),
			]}, new Geo());
			l.send({});
			assert.deepEqual(res, ['P1', 'P2', 'P3']);
			res.length = 0;  // reset res
			l.send({}, false, ['P1', 'P4']);
			assert.deepEqual(res, ['P2', 'P3']);
		});
	});


	suite('getAllItems', function () {

		test('works as expected', function () {
			var i1 = new Item({tsid: 'I1'});
			var i3 = new Item({tsid: 'I3'});
			var i5 = new Item({tsid: 'I5'});
			var b3 = new Bag({tsid: 'B3', items: [i5]});
			var b2 = new Bag({tsid: 'B2', items: [b3], hiddenItems: [i3]});
			var l = new Location({tsid: 'L1', items: [i1, b2]}, new Geo());
			//jscs:disable disallowQuotedKeysInObjects
			assert.deepEqual(l.getAllItems(), {
				'I1': i1,
				'B2': b2,
				'B2/I3': i3,
				'B2/B3': b3,
				'B2/B3/I5': i5,
			});
			//jscs:enable disallowQuotedKeysInObjects
		});
	});


	suite('getPath', function () {

		test('works as expected', function () {
			var i1 = new Item({tsid: 'I1'});
			var i2 = new Item({tsid: 'I2'});
			var i3 = new Item({tsid: 'I3'});
			var b = new Bag({tsid: 'B1', items: [i2], hiddenItems: [i1]});
			var l = new Location({tsid: 'L1', items: [b, i3]}, new Geo());
			assert.strictEqual(l.getPath('I3'), i3);
			assert.strictEqual(l.getPath('B1'), b);
			assert.strictEqual(l.getPath('B1/I1'), i1);
			assert.strictEqual(l.getPath('B1/I2'), i2);
			assert.isNull(l.getPath('BFOO/IBAR'), 'returns null if path not found');
			assert.isNull(l.getPath(), 'returns null for invalid argument');
		});
	});
});

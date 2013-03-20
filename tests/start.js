var assert = require("assert");
var http = require("http");
var testUtil = require("../tests/lib/util");

var config = testUtil.config;

http.get = testUtil.httpGetStub;

module.exports.startTest = function(test) {
	test.expect(1);

	var onStarted = function() {
		downloader.removeListener("onStarted", onStarted);
		test.ok(true, "started");
		downloader.stop();
		test.done();
	};

	var onError = function() {
		downloader.removeListener("onError", onError);
		test.fail(msg);
		downloader.stop();
		test.done();
	};

	var downloader = require("../index.js");
	downloader.init(config);
	downloader.on("onStarted", onStarted);
	downloader.on("onError", onError);
	downloader.start();
};
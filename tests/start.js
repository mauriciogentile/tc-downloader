var assert = require("assert");
var http = require("http");
var testUtil = require("../tests/lib/util");
var sinon = require("sinon");

var config = testUtil.config;

module.exports["should start with no errors"] = function(test) {
	http.get = testUtil.httpGetStub;

	test.expect(2);

	var onStarted = sinon.spy();
	var onError = sinon.spy();

	var downloader = require("../index.js");
	downloader.init(config);
	downloader.on("onStarted", onStarted);
	downloader.on("onError", onError);
	downloader.start();

	test.ok(onStarted.called, "onStarted not called");
	test.ok(!onError.called, "onError not called");

	downloader.stop();

	test.done();
};
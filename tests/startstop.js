var assert = require("assert");
var http = require("http");
var testUtil = require("../tests/lib/util");

var config = testUtil.config;

http.get = testUtil.httpGetStub;

module.exports["should start & stop"] = function(test) {
	var onStarted = function() {
		//downloader.removeListener("onStarted", onStarted);
		downloader.stop();
	};

	var onStopped = function() {
		//downloader.removeListener("onStopped", onStopped);
		test.ok(true, "stopped");
		test.done();
	};

	var onError = function(msg) {
		//downloader.removeListener("onError", onError);
		test.fail(msg);
		downloader.stop();
		test.done();
	};

	var downloader = require("../index.js");
	downloader.init(config);
	downloader.on("onStarted", onStarted);
	downloader.on("onStopped", onStopped);
	downloader.on("onError", onError);
	downloader.start();
};
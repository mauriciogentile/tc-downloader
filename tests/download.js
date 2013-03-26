var assert = require("assert");
var fs = require("fs");
var http = require("http");
var testUtil = require("../tests/lib/util");
var sinon = require("sinon");

var config = testUtil.config;

http.get = testUtil.httpGetStub;

var deleteFiles = function() {
	try {
		fs.rmdir("./downloads");
		fs.unlinkSync("./downloadHistory.txt");
	}
	catch(e) {}
};

module.exports.setUp = function(cb) {
	deleteFiles();
	cb();
};

module.exports.tearDown = function(cb) {
	deleteFiles();
	cb();
};

module.exports["should download file to folder"] = function(test) {
	test.expect(2);

	var onStopped = function() {
		downloader.removeListener("onStopped", onStopped);
		test.ok(fs.existsSync("./downloads/test.xml"), "file does not exist");
		test.done();
	};

	var onError = sinon.spy();

	var downloader = require("../index.js");
	downloader.init(config);
	downloader.on("onError", onError);
	downloader.on("onStopped", onStopped);
	downloader.start();
	
	setTimeout(function() {
		test.ok(!onError.called, "onError not called");
		downloader.stop();
	}, 2000);
};
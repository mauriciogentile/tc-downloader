var http = require("http");
var fs = require("fs");

module.exports.httpGetStub = function(options, callback) {
	fs.readFile("./tests//testfiles/response.xml", "utf8", function(err, data) {
		var response = {
			on: function(evt, callback) {
				if(evt === "data") {
					callback(data);
					return;
				}
				else if(evt === "end") {
					callback();
					return;
				}
			},
			headers: { "content-disposition" : "something;file=\"test.xml\";" },
			pipe: function(content) {},
			setEncoding: function() {},
			statusCode: 200
		};
		callback(response);
	});
	return request = {
		on: function(evt, data) {},
		end: function() {}
	};
};

module.exports.config = {
	retryIntervalSeconds: 60,
	downloadFolder: "./downloads/",
	teamcity: {
		hostName : "localhost",
		hostPort : 1234,
		feedPath : "/feed",
		feedParams : "itemsType=builds&buildStatus=successful&userKey=guest",
		artifactZipPath : "repository/downloadAll/",
		username : "mgentile",
		password : "mg030696"
	}
};
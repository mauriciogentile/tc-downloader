var util = require("util");
var http = require("http");
var fs = require("fs");
var url = require("url");
var nconf = require("nconf");
var lineReader = require("line-reader");
var parseString = require("xml2js").parseString;
var querystring = require("querystring");
var EventEmitter = new require("events").EventEmitter;

var downloadHistoryFilePath = "./downloadHistory.txt";
var downloadHistory = [];
var config;
var timeoutId = 0;
var ready = false;
var initializing = false;

var events = {
	onError: "onError",
	onFileDownloaded: "onFileDownloaded",
	onReady: "onReady",
	onStopped: "onStopped",
	onStarted: "onStarted"
};

var Downloader = function() {
	var self = this;

	EventEmitter.call(self);
	
	var loadHistory = function(cb) {
		if(fs.existsSync(downloadHistoryFilePath)) {
			lineReader.eachLine(downloadHistoryFilePath, function(line, last) {
				downloadHistory.push(line.replace("\r", ""));
				console.log(line);
				if (last) {
					cb();
				}
			});
		}
		else {
			cb();
		}
	};

	var initFolders = function() {
		if(!fs.existsSync(config.downloadFolder)) {
			fs.mkdir(config.downloadFolder);
		}
	};

	var loadConfig = function() {
		var confFile = "./config/config.json";
		if (!fs.existsSync(confFile)) {
			throw "File '" + confFile + "' was not found!";
		}
		nconf.file({ file: confFile });
		config = {};
		config.teamcity = nconf.get("teamcity");
		config.retryIntervalSeconds = nconf.get("retryIntervalSeconds");
		config.downloadFolder = nconf.get("downloadFolder");	
	};

	var startDownload = function() {
		var options = {
			hostname: config.teamcity.hostName,
			port: config.teamcity.hostPort,
			path: config.teamcity.feedPath,
			param: config.teamcity.feedParams
		};

		var download = function() {
			var request = http.get(options, function(response) {
				if(response.statusCode !== 200) {
					self.emit(events.onError, "problem getting feed from " + options.hostname + ". Status code is: " + response.statusCode);
				}

			  	response.setEncoding("utf8");

			  	var data = "";
			  	
			  	response.on("data", function (chunk) {
			    	data += chunk;
			  	});
			  	
			  	response.on("end", function () {
			  		response.statusCode = 404;
			  		if(data.length === 0) {
			  			self.emit(events.onError, "problem getting feed from " + options.hostname);
			  			return;
			  		}
			    	parseString(data, {trim: true}, function (err, result) {
			    		result.feed.entry.forEach(function(entry) {
			    			var buildUrl = entry.link[0].$.href;
			    			downloadArtifact(config, buildUrl);
			    		});
			  		});
			  	});
			});

			request.on("error", function(e) {
			  self.emit(events.onError, "problem requesting feed: " + e.message);
			});

			request.end();

			timeoutId = setTimeout(download, config.retryIntervalSeconds * 1000);
		};

		download();
	};

	var downloadArtifact = function(conf, buildUrl) {
		var parsedBuildUrl = url.parse(buildUrl);
		var query = querystring.parse(parsedBuildUrl.query);
		var artifactPath = config.teamcity.artifactZipPath + query.buildTypeId + "/" + query.buildId + ":id/artifacts.zip";

		if(downloadHistory.indexOf(artifactPath) === -1) {
			var artifactUrl = parsedBuildUrl.protocol + "//" + config.teamcity.username + ":" + config.teamcity.password + "@" +
				parsedBuildUrl.hostname + ":" + parsedBuildUrl.port + "/" + artifactPath;

			var request = http.get(artifactUrl, function(response) {
				try {
					var contentDisp = response.headers["content-disposition"];
					var fileName = contentDisp.split(";")[1].split("=")[1].replace("\"", "").replace("\"", "");
					var file = fs.createWriteStream(config.downloadFolder + fileName);
					response.pipe(file);
					updateDwnloadHistory(artifactPath);
					self.emit(events.onFileDownloaded, file.path);
				}
				catch(e) {
					self.emit(events.onError, "problem downloading file: " + e.message);
				}
			});
			
			request.on("error", function(e) {
			  self.emit(events.onError, "problem downloading file: " + e.message);
			});

			request.end();
		}
	};

	var updateDwnloadHistory = function(artifactPath) {
		downloadHistory.push(artifactPath);
		fs.appendFile(downloadHistoryFilePath, artifactPath + "\r\n", function (err) {
			if (err) {
				self.emit(events.onError, "error saving history file: " + err);
			}
		});
	};

	self.init = function(conf) {
		initializing = true;
		config = conf;
		if(!config) {
			loadConfig();
		}
		initFolders();
		loadHistory(function() {
			ready = true;
			self.emit(events.onReady);
		});
	};
	
	self.start = function() {
		if(!ready && !initializing) {
			throw "'Init' method has not been called!";
		}

		while(!ready) {
			setTimeout(self.start, 10);
			return;
		}

		startDownload();
		self.emit(events.onStarted);
	};
	
	self.stop = function() {
		if(timeoutId === 0) {
			return;
		}
		clearInterval(timeoutId);
		self.emit(events.onStopped);
	};
};

util.inherits(Downloader, EventEmitter);

module.exports = new Downloader();
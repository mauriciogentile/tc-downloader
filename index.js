var util = require("util");
var http = require("http");
var fs = require("fs");
var url = require("url");
var nconf = require("nconf");
var lazy = require("lazy");
var parseString = require("xml2js").parseString;
var querystring = require("querystring");
var EventEmitter = new require("events").EventEmitter;

var downloadHistoryFilePath = "./downloadHistory.txt";
var downloadHistory = [];
var config;
var intervalId = 0;
var ready = false;

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
	
	var _loadHistory = function() {
		fs.exists(downloadHistoryFilePath, function(exists) {
			if(!exists) return;
			new lazy(fs.createReadStream(downloadHistoryFilePath)).lines.forEach(function(line) {
		         downloadHistory.push(line.toString().replace("\r", ""));
		    });
		});
	};

	var _initFolders = function() {
		if(!fs.existsSync(config.downloadFolder)) {
			fs.mkdir(config.downloadFolder);
		}
	};

	var _loadConfig = function() {
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

	var _startDownload = function() {
		var options = {
			hostname: config.teamcity.hostName,
			port: config.teamcity.hostPort,
			path: config.teamcity.feedPath,
			param: config.teamcity.feedParams
		};

		var _download = function(options) {
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
			    			_downloadArtifact(config, buildUrl);
			    		});
			  		});
			  	});
			});

			request.on("error", function(e) {
			  self.emit(events.onError, "problem requesting feed: " + e.message);
			});

			request.end();
		};

		_download(options);
		_startDownloadInterval(function() { _download(options); });
	};

	var _startDownloadInterval = function(call) {
		intervalId = setInterval(call, config.retryIntervalSeconds * 1000);
	};

	var _downloadArtifact = function(conf, buildUrl) {
		var parsedBuildUrl = url.parse(buildUrl);
		var query = querystring.parse(parsedBuildUrl.query);
		var artifactPath = config.teamcity.artifactZipPath + query.buildTypeId + "/" + query.buildId + ":id/artifacts.zip";

		if(downloadHistory.indexOf(artifactPath) >= 0) {
			return;
		}

		var artifactUrl = parsedBuildUrl.protocol + "//" + config.teamcity.username + ":" + config.teamcity.password + "@" +
			parsedBuildUrl.hostname + ":" + parsedBuildUrl.port + "/" + artifactPath;

		var request = http.get(artifactUrl, function(response) {
			try {
				var contentDisp = response.headers["content-disposition"];
				var fileName = contentDisp.split(";")[1].split("=")[1].replace("\"", "").replace("\"", "");
				var file = fs.createWriteStream(config.downloadFolder + fileName);
				response.pipe(file);
				_updateDwnloadHistory(artifactPath);
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
	};

	var _updateDwnloadHistory = function(artifactPath) {
		downloadHistory.push(artifactPath);
		fs.appendFile(downloadHistoryFilePath, artifactPath + "\r\n", function (err) {
			if (err) {
				self.emit(events.onError, "error saving history file: " + err);
			}
		});
	};

	self.init = function(conf) {
		config = conf;
		if(!config) {
			_loadConfig();
		}
		_loadHistory();
		_initFolders();
		self.emit(events.onReady);
	};
	
	self.start = function(callback) {
		_startDownload();
		self.emit(events.onStarted);
	};
	
	self.stop = function(callback) {
		if(intervalId === 0) {
			return;
		}
		clearInterval(intervalId);
		self.emit(events.onStopped);
	};
};

util.inherits(Downloader, EventEmitter);

module.exports = new Downloader();
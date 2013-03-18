var nconf = require("nconf");
var http = require("http");
var url = require("url");
var parseString = require("xml2js").parseString;
var querystring = require("querystring");
var lazy = require("lazy");
var fs = require("fs");

var downloadHistoryFilePath = "./ignore.txt";
var downloadHistory = [];
var config = {};
var intervalId = 0;
var ready = false;
var downloader = {};
var logger;

module.exports = {
	init: function(conf, logger) {
		config = conf;
		if(!config) {
			loadConfig();
		}
		loadHistory();
		initFolders();
		this.logger = logger;
	},
	start: function() {
		logInfo("Starting...");
		startDownload();
		logInfo("Started!");
	},
	stop: function() {
		logInfo("Stoping...");
		if(intervalId === 0) {
			return;
		}
		claerInterval(intervalId);
		logInfo("Stopped!");
	}
};

var loadHistory = function() {
	fs.exists(downloadHistoryFilePath, function(exists) {
		if(!exists) return;
		new lazy(fs.createReadStream(downloadHistoryFilePath)).lines.forEach(function(line) {
	         downloadHistory.push(line.toString().replace("\r", ""));
	    });
	});
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

var logError = function(err) {
	log().error(err);
};

var logInfo = function(info) {
	log().info(info);
};

var log = function() {
	if(!logger) {
		logger = require('winston');
	}
	return logger;
};

var startDownload = function() {
	var options = {
		hostname: config.teamcity.hostName,
		port: config.teamcity.hostPort,
		path: config.teamcity.feedPath,
		param: config.teamcity.feedParams
	};

	var download = function(options) {
		var request = http.get(options, function(response) {
		  	response.setEncoding("utf8");

		  	var data = "";
		  	
		  	response.on("data", function (chunk) {
		    	data += chunk;
		  	});
		  	
		  	response.on("end", function () {
		    	parseString(data, {trim: true}, function (err, result) {
		    		result.feed.entry.forEach(function(entry) {
		    			var buildUrl = entry.link[0].$.href;
		    			downloadArtifact(config, buildUrl);
		    		});
		  		});
		  	});
		});

		request.on('error', function(e) {
		  logError('problem with request: ' + e.message);
		});

		request.end();
	};

	download(options);
	startDownloadInterval(function() { download(options); });
};

var startDownloadInterval = function(call) {
	intervalId = setInterval(call, config.retryIntervalSeconds * 1000);
};

var downloadArtifact = function(conf, buildUrl) {
	var parsedBuildUrl = url.parse(buildUrl);
	var query = querystring.parse(parsedBuildUrl.query);
	var artifactPath = config.teamcity.artifactZipPath + query.buildTypeId + "/" + query.buildId + ":id/artifacts.zip";

	if(downloadHistory.indexOf(artifactPath) >= 0) {
		return;
	}

	var artifactUrl = parsedBuildUrl.protocol + "//" + config.teamcity.username + ":" + config.teamcity.password + "@" +
		parsedBuildUrl.hostname + ":" + parsedBuildUrl.port + "/" + artifactPath;

	var request = http.get(artifactUrl, function(response) {
		var contentDisp = response.headers["content-disposition"];
		var fileName = contentDisp.split(";")[1].split("=")[1].replace("\"", "").replace("\"", "");
		console.log(fileName);
		var file = fs.createWriteStream(config.downloadFolder + fileName);
		response.pipe(file);
		updateDwnloadHistory(artifactPath);
	});
};

var updateDwnloadHistory = function(artifactPath) {
	downloadHistory.push(artifactPath);
	fs.appendFile(downloadHistoryFilePath, artifactPath + "\r\n", function (err) {
		if (err) { 
			logError("Error logging: " + err);
		}
	});
};
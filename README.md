##Installation
```bash
npm install tc-downloader
```

##Usage

```js
var downloader = require("tc-downloader");

var config = {
  	retryIntervalSeconds : 60,
	downloadFolder : "./downloads/",
	teamcity : {
		hostName : "teamcity.server.com",
		hostPort : "8080",
		feedPath : "/guestAuth/feed.html",
		feedParams : "itemsType=builds&buildStatus=successful&userKey=guest",
		artifactZipPath : "repository/downloadAll/",
	    username : "myuser",
	    password : "mypass"
	}
};

downloader.init(config);

downloader.start();

//and then stop it
downloader.stop();
```

###tc-downloader inherits from EventEmitter:

```js
"onReady", "onStarted", "onError", "onStopped", "onFileDownloaded"
```

```js
downloader.on("onError", function(err) {
	console.log(err);
});

downloader.on("onFileDownloaded", function(file) {
	console.log(file);
});
```

##Deploy with windser as a Windows Service:
###(see http://jfromaniello.github.com/winser for more info)

```bash
npm install winser -g
winser -i
```
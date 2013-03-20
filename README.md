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

downloader.on("onError", function(err) {
	console.log(err);
});

downloader.on("onFileDownloaded", function(file) {
	console.log(file);
});

downloader.start();

//and then stop it
downloader.stop();
```

##With windser:

```bash
npm run-script install-windows-service
```

###package.json
```js
  "scripts": {
    "install-windows-service": "winser -i",
    "uninstall-windows-service": "winser -r"
  },
```

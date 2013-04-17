#!/usr/bin/env node

var request		= require("request"),
	cli			= require("commander"),
	bas			= require("bas"),
	packageInfo	= require("./package.json");

cli
	.version(packageInfo.version)
	.option("-i --interval [number]",	"Interval (in ms) to check the WWDC site. Defaults to 1000.")
	.option("-v --verbose",				"Verbose output")
	.option("-g --get [url]",			"URL to request when the site changes")
	.parse(process.argv);

var testSuite		= new bas(),
	wwdcURL			= "http://developer.apple.com/wwdc/",
	siteRequested	= false;

testSuite.loadSheet(__dirname + "/monitor.bas")
	.yep(function() {
		console.log("Assertion sheet loaded. Beginning checks!");
		checkLoop()
	});

function checkLoop() {
	
	request(wwdcURL,function(err,res,body) {
		
		if (err)
			return console.error(err);
		
		testSuite.run(wwdcURL,res,body);
		
		setTimeout(checkLoop,parseInt(cli.interval,10)||1000);
	});
}

testSuite.on("assertionfailed",function(assertionErr) {
	if (!cli.verbose) return;
	
	assertionErr.forEach(function(err) {
		console.error(err.message);
	})
});

testSuite.on("assertionsucceeded",function(assertion) {
	if (cli.verbose) console.log("Assertion succeeded:",assertion);
});

testSuite.on("end",function(url,errors) {
	
	if (errors.length) {
		console.log("WWDC Site has changed! Check now!");
		
		if (cli.get && !siteRequested) {
			console.log("Requesting %s...",cli.get)
			siteRequested = true;
			
			request(cli.get,function(err,res,body) {
				if (err) {
					siteRequested = false;
					return console.err("Error requesting alert URL:",err);
				}
				
				console.log("Alert script requested.");
				console.log(body);
			});
		}
		
		return;
		
	} else if (cli.verbose) {
		console.log("Test suite completed with no assertion failures.");
		
	}
	
	// If assertions started succeeding, the last change alert was probably
	// a false positive. Reset this so we can request again soon!
	siteRequested = false;
});
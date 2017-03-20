/*jslint node*/
var https = require("https");

exports.results = function (resultsData, callback) {
    "use strict";
    var data = "";
    try {
        data = JSON.stringify(resultsData);
    } catch (e) {
        callback(e, false, "Invalid results format.");
        return;
    }
    
    var options = {
        protocol: "https:",
        hostname: "www.tesults.com",
        port: 443,
        path: "/results",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data)
        }
    };

    var req = https.request(options, function (res) {
        var resData = undefined;
        res.setEncoding("utf8");
        res.on("data", function (d) {
            resData = d;
        });
        res.on("end", function () {
            if (res.statusCode === 200) {
                callback(undefined, true, JSON.parse(resData).data.message);
            } else {
                callback(undefined, false, JSON.parse(resData).error.message);
            }
            
        });
    });

    req.on("error", function (err) {
        callback(err, false, "Library error.");
    });
    
    req.write(data);
    req.end();
};
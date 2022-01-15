/*jslint node*/
const https = require("https");
const fs = require('fs');
const aws = require("aws-sdk");

const refreshCredentails = function (target, key, callback) {
    "use strict";
    let data = undefined;
    let params = {target: target, key: key};
    try {
        data = JSON.stringify(params);
    } catch (e) {
        callback(e, {success: false, message: "Invalid data format.", auth: undefined});
        return;
    }
    
    let options = {
        protocol: "https:",
        hostname: "www.tesults.com",
        port: 443,
        path: "/permitupload",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data)
        }
    };

    let req = https.request(options, function (res) {
        let resData = undefined;
        res.setEncoding("utf8");
        res.on("data", function (d) {
            resData = d;
        });
        res.on("end", function () {
            if (res.statusCode === 200) {
                const responseData = JSON.parse(resData).data;
                const message = responseData.message;
                const upload = responseData.upload;
                callback(undefined, {success: true, message: message, upload: upload});
            } else {
                const message = JSON.parse(resData).error.message;
                callback(undefined, {success: false, message: message, upload: undefined});
            }
        });
    });

    req.on("error", function (err) {
        const message = "Library error.";
        callback(err, {success: false, message: message, upload: undefined});
    });
    
    req.write(data);
    req.end();
};

const s3Create = function (auth) {
    "use strict";
    return new aws.S3({
        apiVersion: "2006-03-01",
        accessKeyId: auth.AccessKeyId,
        secretAccessKey: auth.SecretAccessKey,
        sessionToken: auth.SessionToken,
        region: "us-east-1"
    });
}

const expireBuffer = 30; // 30 seconds
const maxActiveUploads = 10; // Upload at most 10 files simulataneously to avoid hogging the client machine.
let uploading = 0;
let warnings = [];
let filesUploaded = 0;
let bytesUploaded = 0;

const filesUpload = function (files, key, auth, target, callback) {
    "use strict";
    if (files.length > 0) {
        while (uploading >= maxActiveUploads) {
            // Wait if already at max active uploads.
        }
        
        let expiration = Number(auth.Expiration);

        // Check if new credentials required.
        let now = Math.round(new Date().getTime()/1000.0);
        if (now + expireBuffer > expiration) { // Check within 30 seconds of expiry.
            refreshCredentails(target, key, function (err, response) {
                if (err) {
                    // Error fetching credentials.
                    let message = "Unable to fetch credentials.";
                    warnings.push(message);
                    callback(err, {message: message, warnings: warnings});
                } else {
                    if (response.success !== true) {
                        // Error fetching credentials.
                        warnings.push(response.message);
                        callback(err, {messsage: response.message, warnings: warnings});
                    } else {
                        // Successful response, check if upload permitted.
                        if (response.upload.permit !== true) {
                            // Must stop due to failure to be permitted new credentials.
                            warnings.push(response.upload.message);
                            callback(undefined, {message: response.upload.message, warnings: warnings});
                        } else {
                            auth = response.upload.auth;
                            filesUpload(files, key, auth, target, callback);
                        }
                    }
                }
            });
        } else {
            // load new file for upload
            let s3 = s3Create(auth);
            let f = files.shift();
            
            if (fs.existsSync(f.file) !== true) {
                warnings.push("File not found: " + f.file);
                filesUpload(files, key, auth, target, callback);
            } else {
                const stats = fs.statSync(f.file);
                const sizeInBytes = stats.size;
                const name = f.file.replace(/^.*[\\\/]/, '');
                const k = key + "/" + f.num + "/" + name;
                const params = {Bucket: "tesults-results", Key: k, Body: fs.createReadStream(f.file)};
                uploading += 1;
                s3.upload(params, function(err, data) {
                    if (err !== undefined && err !== null) {
                        warnings.push("Unable to upload file: " + f.file);
                    } else {
                        filesUploaded += 1;
                        bytesUploaded += sizeInBytes;
                    }
                    uploading -= 1;
                    filesUpload(files, key, auth, target, callback);
                });
            }
        }
    } else {
        while (uploading !== 0) {
            // Wait for uploads to complete.
        }
        const message = filesUploaded + " files uploaded. " + bytesUploaded + " bytes uploaded.";
        callback(undefined, {message: message, warnings: warnings});
    }
};

const filesInTestCases = function (data) {
    "use strict";
    const cases = data.results.cases;
    let files = [];
    let num = 0;
    cases.forEach(function (c) {
        if (c.files !== undefined) {
            c.files.forEach(function (f) {
                files.push({num: num, file: f})
            });
        }
        num += 1;
    });
    return files;
};

exports.results = function (resultsData, callback) {
    "use strict";
    let data = "";
    try {
        let values = [];
        data = JSON.stringify(resultsData, (key, value) => {
            // Custom replacer function to guard against circular structure
            if (typeof value === 'object' && value !== null) {
                if (values.includes(value)) {
                    return;
                } else {
                    values.push(value);
                }
            }
            return value;
        });
    } catch (e) {
        callback(e, {success: false, message: "Invalid results format.", warnings: [], errors: []});
        return;
    }
    
    let options = {
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

    let req = https.request(options, function (res) {
        let resData = undefined;
        res.setEncoding("utf8");
        res.on("data", function (d) {
            resData = d;
        });
        res.on("end", function () {
            if (res.statusCode === 200) {
                let responseData = undefined
                let message = ""
                let upload = undefined
                try {
                    responseData = JSON.parse(resData).data;
                    message = responseData.message;
                    upload = responseData.upload;
                } catch (err) {
                    try {
                        responseData = resData.data
                        message = responseData.message;
                        upload = responseData.upload;
                    } catch (err) {
                        // Unexpected success response
                        message = "Unexpected success response message"
                    }
                }
                if (upload === undefined) { // No files for upload, finished.
                    callback(undefined, {success: true, message: message, warnings: [], errors: []});
                } else {
                    const target = resultsData.target;
                    const files = filesInTestCases(resultsData);

                    const key = upload.key;
                    const uploadMessage = upload.message;
                    const permit = upload.permit;
                    const auth = upload.auth;

                    if (permit !== true) { // Files present but upload not permitted.
                        callback(undefined, {success: true, message: message, warnings: [uploadMessage], errors:[]});
                    } else {
                        filesUpload(files, key, auth, target, function (err, result) {
                            if (err) {
                                callback(undefined, {success: true, message: message + ". View warnings.", warnings: ["File upload error: " + err], errors: []});
                            } else {
                                // result format: {message: <message>, warnings:[<warnings>]}
                                callback(undefined, {success: true, message: message + " " + result.message, warnings: result.warnings, errors:[]});
                            }
                        });
                    }
                }
            } else {
                let message = "Unexpected error";
                try {
                    message = JSON.parse(resData).error.message;
                } catch (err) {
                    // resData not JSON string
                }
                if (message === "Unexpected error") {
                    try {
                        message = resData.error.message;
                    } catch (err) {
                        // resData not JS Object
                    }
                }
                callback(undefined, {success: false, message: message, warnings: [], errors: [message]});
            }
        });
    });

    req.on("error", function (err) {
        const message = "Library error.";
        callback(err, {success: false, message: message, warnings: [], errors:[message]});
    });
    
    req.write(data);
    req.end();
};
# Tesults

Tesults is a test automation results reporting service. https://www.tesults.com

This API library makes it easier to upload your test results in your node application.

## Installation

`npm install tesults --save`

## Configuration

 ```js
var tesults = require('tesults');
```

## Documentation

Documentation is available at https://www.tesults.com/docs.

## API Overview

Upload test results using the results method:

```js
tesults.results(data, function (err, success, message) {
    // err is undefined unless there is a library error
    // success is a bool, true if results successfully uploaded, false otherwise
    // message is a string, if success is false, check message to see why upload failed
});
```

The data param in results is an object containing your test results in the form:

```js
var data = {
    target: 'token',
    results: {
        cases: [
            {
                name: 'Test 1',
                desc: 'Test 1 description.',
                suite: 'Suite A',
                result: 'pass'
            },
            {
                name: 'Test 2',
                desc: 'Test 2 description.',
                suite: 'Suite A',
                result: 'fail',
                reason: 'Assert fail in line 203, example.js'
            },
            {
                name: 'Test 3',
                desc: 'Test 3 description.',
                suite: 'Suite B',
                result: 'pass',
                params: {
                    param1: 'value1',
                    param2: 'value2'
                },
                files: ['/path/to/file/log.txt', '/path/to/file/screencapture.png']
            }
        ]
    }
}
```

The target value, 'token' above should be replaced with your Tesults target token. If you have lost your token you can regenerate one at https://www.tesults.com/config. The cases array should contain your test cases.

## Support

support@tesults.com

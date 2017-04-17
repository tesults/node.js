const tesults = require('./index.js')

const data = {
  target: 'target',
  results: {
    cases: [
    {
      name: 'Test 1',
      desc: 'Test 1 description.',
      suite: 'Suite A',
      result: 'pass',
      files: ['/Users/admin/Desktop/TestFiles/log0.txt', '/Users/admin/Desktop/TestFiles/log1.txt']
    },
    {
      name: 'Test 2',
      desc: 'Test 2 description.',
      suite: 'Suite A',
      result: 'fail',
      reason: 'Assert fail in line 203, example.js',
      files: ['/Users/admin/Desktop/TestFiles/log0.txt', '/Users/admin/Desktop/TestFiles/log1.txt']
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
      files: ['/Users/admin/Desktop/TestFiles/log0.txt', '/Users/admin/Desktop/TestFiles/log1.txt']
    }
    ],
    build: '1.0.0'
  }
}

tesults.results(data, function (err, response) {
    if (err) {
        console.log('Error: ' + err);
    } else {
        console.log('Success: ' + response.success);
        console.log('Message: ' + response.message);
        console.log('Warnings: ' + response.warnings.length);
        console.log('Errors: ' + response.errors.length);
    }
});
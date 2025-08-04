const { sanitizeString, sanitizeObject } = require('../middleware/xssProtection');

const xssTestCases = [

    '<script>alert("XSS")</script>',
    '<script>document.cookie="malicious=1"</script>',


    '<img src="x" onerror="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
    '<body onload="alert(1)">',


    'javascript:alert(1)',
    'javascript:void(0)',


    'data:text/html,<script>alert(1)</script>',


    '&lt;script&gt;alert(1)&lt;/script&gt;',


    '<ScRiPt>alert(1)</ScRiPt>',


    '<div><script>alert(1)</script></div>',


    '" onmouseover="alert(1)',
    "' onload='alert(1)",


    '<style>body{background:url("javascript:alert(1)")}</style>',


    '<svg onload="alert(1)">',


    '<iframe src="javascript:alert(1)"></iframe>',


    '<object data="javascript:alert(1)">',


    '<embed src="javascript:alert(1)">',


    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',


    '<base href="javascript:alert(1)//">',


    '<form action="javascript:alert(1)"><input type="submit"></form>',


    '<!--<script>alert(1)</script>-->',


    '<![CDATA[<script>alert(1)</script>]]>',


    'expression(alert(1))',


    'vbscript:msgbox("XSS")',


    'livescript:alert(1)',
    'mocha:alert(1)',


    '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',


    '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;',


    '%3Cscript%3Ealert(1)%3C/script%3E'
];

const testXSSProtection = () => {
    console.log('Testing XSS Protection...\n');

    const results = {
        passed: 0,
        failed: 0,
        details: []
    };

    xssTestCases.forEach((testCase, index) => {
        const sanitized = sanitizeString(testCase);
        const isSafe = !sanitized.includes('<script') &&
            !sanitized.includes('javascript:') &&
            !sanitized.includes('onload') &&
            !sanitized.includes('onerror') &&
            !sanitized.includes('alert');

        const result = {
            test: index + 1,
            input: testCase,
            output: sanitized,
            safe: isSafe,
            status: isSafe ? 'PASS' : 'FAIL'
        };

        results.details.push(result);

        if (isSafe) {
            results.passed++;
        } else {
            results.failed++;
        }

        console.log(`Test ${index + 1}: ${result.status}`);
        console.log(`Input:  ${testCase}`);
        console.log(`Output: ${sanitized}`);
        console.log('---');
    });

    console.log(`\nTest Results:`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${(results.passed / xssTestCases.length * 100).toFixed(1)}%`);

    return results;
};

const testObjectSanitization = () => {
    console.log('\nTesting Object Sanitization...\n');

    const testObject = {
        name: 'John<script>alert(1)</script>',
        email: 'test@example.com',
        bio: 'Hello <img src="x" onerror="alert(1)"> world',
        profile: {
            website: 'javascript:alert(1)',
            social: {
                twitter: '@user<script>alert(1)</script>'
            }
        },
        tags: [
            'tag1',
            '<script>alert(1)</script>',
            'tag3<img src="x" onerror="alert(1)">'
        ]
    };

    console.log('Original Object:');
    console.log(JSON.stringify(testObject, null, 2));

    const sanitized = sanitizeObject(testObject);

    console.log('\nSanitized Object:');
    console.log(JSON.stringify(sanitized, null, 2));

    const jsonString = JSON.stringify(sanitized);
    const isSafe = !jsonString.includes('<script') &&
        !jsonString.includes('javascript:') &&
        !jsonString.includes('onerror') &&
        !jsonString.includes('alert');

    console.log(`\nObject Sanitization: ${isSafe ? 'SAFE' : 'UNSAFE'}`);

    return { original: testObject, sanitized, safe: isSafe };
};

const runAllTests = () => {
    console.log('XSS Protection Test Suite');
    console.log('============================\n');

    const stringResults = testXSSProtection();
    const objectResults = testObjectSanitization();

    const overallSuccess = stringResults.failed === 0 && objectResults.safe;

    console.log('\nOverall Result:');
    console.log(`XSS Protection: ${overallSuccess ? 'SECURE' : 'VULNERABLE'}`);

    return {
        stringTests: stringResults,
        objectTests: objectResults,
        overall: overallSuccess
    };
};

module.exports = {
    xssTestCases,
    testXSSProtection,
    testObjectSanitization,
    runAllTests
};

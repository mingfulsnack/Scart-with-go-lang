// Test frontend login using Node.js built-in https module
const https = require('https');
const http = require('http');

function testFrontendLogin() {
    const data = JSON.stringify({
        username: 'testuser',
        password: '123456'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log('Testing frontend-style login...');
    console.log('Sending data:', data);

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);

        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log('Response:', responseData);
        });
    });

    req.on('error', (e) => {
        console.error(`Error: ${e.message}`);
    });

    req.write(data);
    req.end();
}

testFrontendLogin();

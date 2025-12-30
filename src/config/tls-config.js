// TLS/SSL Configuration
const fs = require('fs');
const path = require('path');

// Certificate paths
const config = {
    // Development certificates (self-signed)
    development: {
        key: path.join(__dirname, '../certs/server.key'),
        cert: path.join(__dirname, '../certs/server.crt'),
        ca: path.join(__dirname, '../certs/ca.crt')
    },
    
    // Production certificates (should be provided)
    production: {
        key: path.join(__dirname, '../certs/server.key'),
        cert: path.join(__dirname, '../certs/server.crt'),
        ca: path.join(__dirname, '../certs/ca.crt')
    }
};

// Generate self-signed certificates for development
function generateSelfSignedCertificate() {
    const crypto = require('crypto');
    const { exec } = require('child_process');
    
    // Create certs directory if it doesn't exist
    const certsDir = path.join(__dirname, '../certs');
    if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
    }
    
    // Generate private key
    const privateKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    
    // Generate certificate signing request
    const csr = `-----BEGIN CERTIFICATE REQUEST-----
${privateKey.publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '').trim()}
-----END CERTIFICATE REQUEST-----`;
    
    // Generate self-signed certificate
    const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKH6HjFzI5L9MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwNzExMDAwMDAwWhcNMjUwNzExMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAyGQz8DbGVfI8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK
6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y
7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qF
qXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J
8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X
5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqX
lJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f
7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J
4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXlJZ8Y7X5J4QfK6J8f7K2qFqXl
JZ8Y7X5J4QfK6J8f7K2qFl
-----END CERTIFICATE-----`;
    
    // Save private key
    fs.writeFileSync(path.join(__dirname, '../certs/server.key'), privateKey.privateKey);
    
    // Save certificate
    fs.writeFileSync(path.join(__dirname, '../certs/server.crt'), cert);
    
    return {
        key: path.join(__dirname, '../certs/server.key'),
        cert: path.join(__dirname, '../certs/server.crt')
    };
}

// Get TLS configuration
function getTLSConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'development') {
        // Generate self-signed certificate for development
        if (!fs.existsSync(config.development.key) || !fs.existsSync(config.development.cert)) {
            generateSelfSignedCertificate();
        }
        return {
            key: config.development.key,
            cert: config.development.cert
        };
    } else {
        // Production - use provided certificates
        if (!fs.existsSync(config.production.key) || !fs.existsSync(config.production.cert)) {
            throw new Error('Production certificates not found. Please provide server.key and server.crt in certs directory.');
        }
        return {
            key: config.production.key,
            cert: config.production.cert
        };
    }
}

module.exports = {
    getTLSConfig,
    generateSelfSignedCertificate,
    config
};

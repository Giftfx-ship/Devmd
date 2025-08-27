const crypto = require('crypto');

// SHA-256 Hash
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

// HMAC-SHA256 Sign
function hmacSign(buffer, key) {
    return crypto.createHmac('sha256', key).update(buffer).digest();
}

// AES Encryption (CBC Mode)
function aesEncrypt(buffer, key) {
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

// AES Decryption (CBC Mode)
function aesDecrypt(buffer, key) {
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

// Generate random bytes
function generateRandomBytes(length) {
    return crypto.randomBytes(length);
}

// Pairing Code Key Derivation (new requirement)
function derivePairingCodeKey(seed) {
    return crypto.createHmac('sha256', seed)
        .update('pairing-code')
        .digest();
}

module.exports = {
    sha256,
    hmacSign,
    aesEncrypt,
    aesDecrypt,
    generateRandomBytes,
    derivePairingCodeKey
};

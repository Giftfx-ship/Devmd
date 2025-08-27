const crypto = require('crypto');

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

function hmacSign(buffer, key) {
    return crypto.createHmac('sha256', key).update(buffer).digest();
}

function aesEncrypt(buffer, key) {
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

function aesDecrypt(buffer, key) {
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

module.exports = {
    sha256,
    hmacSign,
    aesEncrypt,
    aesDecrypt
};

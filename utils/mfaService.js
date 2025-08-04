
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

exports.generateSecret = (email) => {
    const secret = speakeasy.generateSecret({
        name: `MeroYatra (${email})`,
    });
    return secret;
};

exports.generateQRCode = async (otpauth_url) => {
    return await qrcode.toDataURL(otpauth_url);
};

exports.verifyToken = (token, secret) => {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
    });
};

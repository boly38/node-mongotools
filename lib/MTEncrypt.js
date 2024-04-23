import fs from 'fs';
import crypto from 'crypto';

const algorithm = 'aes-256-ctr';
const expectedKeyLength = 32;// aes-256-ctr require 32 byte length key
const iv = "NODE-MONGOTOOLS_";// crypto.randomBytes(16);

// credit - July 30, 2020 - Atta : https://attacomsian.com/blog/nodejs-encrypt-decrypt-data
class MTEncrypt {

    encrypt(source, destination, secretKey, removeSource = true) {
        return new Promise(resolve => {
            if (!secretKey || secretKey.length !== expectedKeyLength) {
                throw new Error(`Encrypt algorithm ${algorithm} require a secret key having ${expectedKeyLength} length`);
            }
            // input file
            const inStream = fs.createReadStream(source);
            // encrypt content
            const encrypt = crypto.createCipheriv(algorithm, secretKey, iv);
            // write file
            const outFileStream = fs.createWriteStream(destination);

            inStream.pipe(encrypt).pipe(outFileStream);

            inStream.on('end', () => {
                if (removeSource === true) {
                    fs.unlinkSync(source);
                }
                resolve();
            });
        });
    }

    decrypt(source, destination, secretKey) {
        return new Promise(resolve => {
            console.info("decrypt " + source + " into " + destination);
            // input file
            const inStream = fs.createReadStream(source);
            // decrypt content
            const decrypt = crypto.createDecipheriv(algorithm, secretKey, iv);
            // write file
            const outFileStream = fs.createWriteStream(destination);

            inStream.pipe(decrypt).pipe(outFileStream);

            inStream.on('end', () => {
                resolve();
            });
        });
    }

}

export default MTEncrypt;
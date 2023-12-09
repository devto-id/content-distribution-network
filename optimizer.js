const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

var processPath = path.resolve(process.cwd(), "optimizer_processes");
var uploadPath = path.resolve(process.cwd(), "uploads");
var tinyWidth = 100;
var smallWidth = 320;
var mediumWidth = 640;

var optimizer = module.exports = {
    processes: [],
    addProcess: function (filename) {
        return new Promise((resolve, reject) => {
            filename += ".txt";
            fs.writeFileSync(path.resolve(processPath, filename), '');
            optimizer.runProcess(filename).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        })
    },
    runProcess: function (txtFileName) {
        if (optimizer.processes.includes(txtFileName) || !fs.existsSync(path.resolve(processPath, txtFileName))) {
            return;
        }

        optimizer.processes.push(txtFileName);

        var realFileName = txtFileName.substring(0, txtFileName.lastIndexOf('.'));
        var buffer = fs.readFileSync(path.resolve(uploadPath, realFileName));
        var fileExt = realFileName.substring(realFileName.lastIndexOf('.') + 1);
        var realFileNameWithoutExt = realFileName.substring(0, realFileName.lastIndexOf('.'));


        const tinyProcess = new Promise((resolve, reject) => {
            sharp(buffer)
                .resize(tinyWidth)
                .toFile(path.resolve(uploadPath, realFileNameWithoutExt + "_tiny" + "." + fileExt))
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        });

        const smallProcess = new Promise((resolve, reject) => {
            sharp(buffer)
                .resize(smallWidth)
                .toFile(path.resolve(uploadPath, realFileNameWithoutExt + "_small" + "." + fileExt))
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        });

        const mediumProcess = new Promise((resolve, reject) => {
            sharp(buffer)
                .resize(mediumWidth)
                .toFile(path.resolve(uploadPath, realFileNameWithoutExt + "_medium" + "." + fileExt))
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        });

        return Promise.all([tinyProcess, smallProcess, mediumProcess])
            .then(() => {
                optimizer.processes.splice(optimizer.processes.indexOf(txtFileName), 1);
                fs.unlinkSync(path.resolve(processPath, txtFileName));
            })
            .catch(err => {
                console.log(err);
                optimizer.processes.splice(optimizer.processes.indexOf(txtFileName), 1);

                if (fs.existsSync(path.resolve(processPath, txtFileName))) {
                    fs.unlinkSync(path.resolve(processPath, txtFileName));
                }
            });
    }
}
var express = require('express');
var router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const optimizer = require('../optimizer');

const
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path,
  ffprobePath = require("@ffprobe-installer/ffprobe").path,
  ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

const uploadPath = path.resolve(process.cwd(), "uploads");

const uploader = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "_" + Math.floor(Math.random() * 100000000000000) + "_" + Math.floor(Math.random() * 100000000000000) + path.extname(file.originalname));
    }
  })
});

router.post('/store', uploader.array("files"), async function (req, res, next) {
  for (var i = 0; i < req.files.length; i++) {
    var imageFileName = req.files[i].filename;

    if (/\.(mp4|avi|mov|mkv|wmv)$/i.test(req.files[i].filename)) {
      imageFileName = req.files[i].filename.substring(0, req.files[i].filename.lastIndexOf('.')) + ".jpg";

      await new Promise((resolve, reject) => {
        ffmpeg(path.resolve(uploadPath, req.files[i].filename))
          .thumbnail({
            timestamps: [0],
            filename: imageFileName,
            folder: uploadPath,
          }).on("end", () => {
            resolve();
          })
      });
    }

    if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(imageFileName)) {
      optimizer.addProcess(imageFileName);
    }
  }

  res.json(req.files.map(file => file.filename));
});

router.get('/:filename', function (req, res, next) {
  var filename = req.params.filename;
  var type = req.query.type;

  if (/\.(mp4|avi|mov|mkv|wmv)$/i.test(filename) && (type == 'thumb' || type == 'thumbnail')) {
    filename = filename.substring(0, filename.lastIndexOf('.')) + ".jpg";
  }

  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(filename)) {
    var size = req.query.size;

    if (size == "small" && fs.existsSync(path.resolve(uploadPath, filename.substring(0, filename.lastIndexOf('.')) + "_small" + filename.substring(filename.lastIndexOf('.'))))) {
      filename = filename.substring(0, filename.lastIndexOf('.')) + "_small" + filename.substring(filename.lastIndexOf('.'));
    } else if (size == "medium" && fs.existsSync(path.resolve(uploadPath, filename.substring(0, filename.lastIndexOf('.')) + "_medium" + filename.substring(filename.lastIndexOf('.'))))) {
      filename = filename.substring(0, filename.lastIndexOf('.')) + "_medium" + filename.substring(filename.lastIndexOf('.'));
    }
  }

  res.sendFile(path.resolve(uploadPath, filename));
});

module.exports = router;

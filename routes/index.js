var express = require('express');
var router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const optimizer = require('../optimizer');
const sizeOf = require('image-size');

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
  try {
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

    res.json(req.files.map(file => {
      var output = {
        url: 'https://cdn.wotagram.com/' + file.filename,
      };

      var size = null;

      if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(file.filename)) {
        size = sizeOf(path.resolve(uploadPath, file.filename));
      } else if (/\.(mp4|avi|mov|mkv|wmv)$/i.test(file.filename)) {
        size = sizeOf(path.resolve(uploadPath, file.filename.substring(0, file.filename.lastIndexOf('.')) + ".jpg"));
      }

      if (size) {
        output.width = size.width;
        output.height = size.height;
        output.ratio = size.width / size.height;
      }

      return output;
    }));
  } catch (error) {
    console.log({ error });
    res.status(500).json({ error });
  }
});

router.get('/:filename', function (req, res, next) {
  var filename = req.params.filename;
  var type = req.query.type;

  if (/\.(mp4|avi|mov|mkv|wmv)$/i.test(filename) && (type == 'thumb' || type == 'thumbnail')) {
    filename = filename.substring(0, filename.lastIndexOf('.')) + ".jpg";
  }

  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(filename)) {
    var size = req.query.size;

    if (size == "tiny" && fs.existsSync(path.resolve(uploadPath, filename.substring(0, filename.lastIndexOf('.')) + "_tiny" + filename.substring(filename.lastIndexOf('.'))))) {
      filename = filename.substring(0, filename.lastIndexOf('.')) + "_tiny" + filename.substring(filename.lastIndexOf('.'));
    } else if (size == "small" && fs.existsSync(path.resolve(uploadPath, filename.substring(0, filename.lastIndexOf('.')) + "_small" + filename.substring(filename.lastIndexOf('.'))))) {
      filename = filename.substring(0, filename.lastIndexOf('.')) + "_small" + filename.substring(filename.lastIndexOf('.'));
    } else if (size == "medium" && fs.existsSync(path.resolve(uploadPath, filename.substring(0, filename.lastIndexOf('.')) + "_medium" + filename.substring(filename.lastIndexOf('.'))))) {
      filename = filename.substring(0, filename.lastIndexOf('.')) + "_medium" + filename.substring(filename.lastIndexOf('.'));
    }
  }

  res.sendFile(path.resolve(uploadPath, filename));
});

router.get('/:filename/stream', function (req, res, next) {
  const range = req.headers.range || "bytes=0-";

  if (!range) {
    res.status(400).send("Requires Range header");
    return;
  }

  const videoSize = fs.statSync(path.resolve(uploadPath, req.params.filename)).size;
  const CHUNK_SIZE = 10 ** 6;
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": `video/${path.extname(req.params.filename).substring(1)}`,
  };

  res.writeHead(206, headers);

  const videoStream = fs.createReadStream(path.resolve(uploadPath, req.params.filename), { start, end });

  videoStream.pipe(res);
});

module.exports = router;

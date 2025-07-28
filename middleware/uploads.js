const multer = require("multer");
const path = require("path");

const maxSize = 2 * 1024 * 1024;

const imageFileFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error("File format not supported."), false);
    }
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `IMG-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: maxSize },
});

module.exports = upload;

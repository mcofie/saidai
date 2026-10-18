const fs = require('fs');
const path = require('path');

// Posts are at most 640px wide, so ask Cloudinary for 640px/1280px copies in the
// best format the browser supports instead of the full-size upload.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const CLOUDINARY_PARAM = /^(?:a|ac|af|ar|b|bo|br|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|pg|q|r|so|sp|t|u|vc|w|x|y|z)_\S+$/;
const isTransformation = segment => segment.split(',').every(part => CLOUDINARY_PARAM.test(part));

// Image sizes are looked up once by bin/image-sizes.js and committed, so builds stay offline.
const IMAGE_SIZES_PATH = path.join(__dirname, '..', 'content', 'image-sizes.json');

function cloudinaryUrl(src, width, extraTransformation) {
    const match = src.match(CLOUDINARY_UPLOAD);
    if (!match) return null;
    const segments = match[2].split('/');
    // Existing crops come first; the resize goes last so it applies to their result.
    let insertAt = 0;
    while (insertAt < segments.length - 1 && isTransformation(segments[insertAt])) insertAt++;
    segments.splice(insertAt, 0, `c_limit,w_${width},f_auto,q_auto`, ...(extraTransformation ? [extraTransformation] : []));
    return match[1] + segments.join('/');
}

function readImageSizes() {
    try {
        return JSON.parse(fs.readFileSync(IMAGE_SIZES_PATH, 'utf8'));
    } catch {
        return {};
    }
}

module.exports = { CLOUDINARY_UPLOAD, IMAGE_SIZES_PATH, cloudinaryUrl, readImageSizes };

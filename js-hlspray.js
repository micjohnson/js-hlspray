var WAD_HEADER_LEN = 12;
var DIR_HEADER_LEN = 32;
var LUMP_HEADER_LEN = 40;
var RGB_TABLE_W_PADDING_LEN = 256*3 + 4;
var MAX_SPRAY_AREA = 12288;
var sprayCanvas;
var imageCanvas;
var context;
var imageContext;
var paletteCanvas;
var paletteContext;
var width;
var height;
var cropshop;
var transparentBorder;

var RESIZE_BROWSER = 1;
var RESIZE_DOWNSCALE = 2;
var RESIZE_HERMITE = 3;
var RESIZE_BROWSER_MULTIPLE = 4;
var resizeMethod = RESIZE_BROWSER;

var QUANTIZE_RGBQUANT = 1;
var QUANTIZE_MMCQ = 2
var quantizeMethod = QUANTIZE_RGBQUANT;

class Spray {
    constructor(width, height, indexes, palette) {
        this.width = width;
        this.heigth = height;
        this.indexes = indexes;
        this.palette = palette;
    }
}

var currentSpray = null;

var selectDimension = function(width, height) {
    var index = -1;
    dimensions = generateValidDimensions();
    for(var i = 0; i < dimensions.length; i++) {
        if(dimensions[i][0]==width&&dimensions[i][1]==height) {
            index = i;
            break;
        }
    }
    if(index==-1) {
        console.log("That dimension is not valid.");
        return;
    }

    sprayCanvas.width = width;
    sprayCanvas.height = height;

    var magnify = parseInt($('input[name=magnify]').val());

    sprayCanvas.style.width = (width * magnify) + "px";
    sprayCanvas.style.height = (height * magnify) + "px";
    $("#canvas-size").val(index);
    if(currentSpray == null) return;
    try {
        drawImageToSpray(croppedCanvas);
    } catch(e) {
        console.log("General error attempting to draw spray.");
    }
};

var generateValidDimensions = function() {
    dimensions = [];
    for(var x = 16; x <= 256; x += 16) {
        for(var y = 16; y <= 256; y += 16) {
            if(x*y<=MAX_SPRAY_AREA) {
                dimensions.push([x,y])
            }
        }
    }
    return dimensions;
};

var selectBestDimension = function() {
    var validDimensions = generateValidDimensions();
    var index = -1;
    var area = 0;
    var wasted = Infinity;
    for(var i=0; i<validDimensions.length; i++) {
        var hRatio = validDimensions[i][0] / croppedCanvas.width;
        var vRatio = validDimensions[i][1] / croppedCanvas.height;
        var ratio  = Math.min(hRatio, vRatio);
        ratio  = Math.min(ratio, 1);

        newWidth = croppedCanvas.width * ratio;
        newHeight = croppedCanvas.height * ratio;
        newWasted = validDimensions[i][0] * validDimensions[i][1] - newWidth * newHeight;
        if(newWidth*newHeight > area || newHeight * newWidth == area && newWasted < wasted) {
            wasted = newWasted;
            area = newHeight*newWidth;
            index = i;
        }
    }
    if(index == -1) {
        console.log("Error finding dimensions.");
        return;
    }
    selectDimension(validDimensions[index][0], validDimensions[index][1]);
};

var loadWad = function(event) {
    var data = event.target.result;
    var view = new jDataView(data);
    var header = {
        prefix: view.getString(4),
        numLumps: view.getUint32(view.tell(), true),
        dirOffset: view.getUint32(view.tell(), true)
    };
    if (header.prefix != 'WAD3') {
        console.log("INVALID WAD HEADER!");
        return false;
    }
    var lumpsDirectory = new Array(header.numLumps);
    view.seek(header.dirOffset);
    for(var i=0; i<header.numLumps; i++) {
        lumpsDirectory[i] = {
            offset: view.getUint32(view.tell(), true),
            lumpSize: view.getUint32(view.tell(), true),
            lumpSizeCompressed: view.getUint32(view.tell(), true),
            type: view.getUint8(view.tell(), true),
            compressed: view.getUint8(view.tell()),
            padding: view.getUint16(view.tell()),
            lumpName: view.getString(16)
        };
    }

    // For now only implementing retreiving the first lump
    // which for a spray wad would be the one and only lump
    view.seek(lumpsDirectory[0].offset);

    var lumpHeader = {
        lumpName: view.getString(16),
        width: view.getUint32(view.tell(), true),
        height: view.getUint32(view.tell(), true),
        imageOffset: view.getUint32(view.tell(), true),
        mip1Offset: view.getUint32(view.tell(), true),
        mip2Offset: view.getUint32(view.tell(), true),
        mip3Offset: view.getUint32(view.tell(), true)
    };

    view.seek(lumpsDirectory[0].offset+lumpHeader.imageOffset);

    var imageData = view.getBytes(lumpHeader.width*lumpHeader.height, view.tell(), true, true);

    view.seek(lumpsDirectory[0].offset+lumpHeader.mip3Offset);
    view.skip(2+lumpHeader.width/8*lumpHeader.height/8);

    palette = new Array(256);
    for(var i=0;i < 256; i++) {
        palette[i] = [
            view.getUint8(),
            view.getUint8(),
            view.getUint8()
        ];
    }

    currentSpray = new Spray(lumpHeader.width, lumpHeader.height, width, height, imageData, palette);

    var canvasBits = context.createImageData(lumpHeader.width, lumpHeader.height);
    for(var x=0; x < lumpHeader.width; x++) {
        for(var y=0; y < lumpHeader.height; y++) {
            offset = y*lumpHeader.width+x;
            if(imageData[offset] == 255) {
                continue;
            }
            color = palette[imageData[offset]];
            canvasBits.data[offset*4] = color[0];
            canvasBits.data[offset*4+1] = color[1];
            canvasBits.data[offset*4+2] = color[2];
            canvasBits.data[offset*4+3] = 255;
        }
    }
    selectDimension(lumpHeader.width, lumpHeader.height);
    // Draw the image data to the canvas
    context.clearRect(0, 0, sprayCanvas.width, sprayCanvas.height);
    context.putImageData(canvasBits, 0, 0);
};

var drawImageToSpray = function(img) {
    context.clearRect(0, 0, sprayCanvas.width, sprayCanvas.height);
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = img.width;
    tmpCanvas.height = img.height;
    tmpCanvas.getContext('2d').drawImage(img, 0, 0);

    var sprayWidth = sprayCanvas.width;
    var sprayHeight = sprayCanvas.height;
    if(transparentBorder) {
        sprayWidth -= 4;
        sprayHeight -= 4;
    }
    var hRatio = sprayWidth / img.width;
    var vRatio = sprayHeight / img.height;
    var ratio  = Math.min(hRatio, vRatio);
    ratio  = Math.min(ratio, 1);

    offset_x = Math.floor((sprayWidth - img.width*ratio)/2.0);
    offset_y = Math.floor((sprayHeight - img.height*ratio)/2.0);

    if(transparentBorder) {
        offset_x += 2;
        offset_y += 2;
    }

    if(resizeMethod == RESIZE_BROWSER || resizeMethod == RESIZE_BROWSER_MULTIPLE) {
        
        if(ratio < 0.5 && resizeMethod == RESIZE_BROWSER_MULTIPLE) {
            ratio = 0.5;
            offset_x = 0;
            offset_y = 0;
            var tmpCanvas2 = document.createElement('canvas');
            tmpCanvas2.width = tmpCanvas.width * ratio;
            tmpCanvas2.height = tmpCanvas.height * ratio;
            tmpCanvas2.getContext('2d').drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, offset_x, offset_y, tmpCanvas.width * ratio, tmpCanvas.height * ratio);
            return drawImageToSpray(tmpCanvas2);
        }
        
        context.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, offset_x, offset_y, tmpCanvas.width * ratio, tmpCanvas.height * ratio);
    } else if(resizeMethod == RESIZE_DOWNSCALE) {
        tmpCanvas = downScaleCanvas(tmpCanvas, ratio);
        context.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, offset_x, offset_y, tmpCanvas.width, tmpCanvas.height);
    } else {
        resample_single(tmpCanvas, tmpCanvas.width * ratio, tmpCanvas.height * ratio, true);
        context.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, offset_x, offset_y, tmpCanvas.width, tmpCanvas.height);
    }
    sharpen(context, sprayCanvas.width, sprayCanvas.height, $('input[name=sharpen]').val());

    $(tmpCanvas).remove();
    convertPalette();
};

var loadImage = function(evt) {
    var img = new Image();
    img.onload = function(evt) {
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        imageContext.clearRect(0, 0, img.width, img.height);
        cropshop.initialize(this);
        drawImageToSpray(this);
    };
    img.src = evt.target.result;
};

var convertImageData = function(data) {
    convertedPixels = [];
    for(var i=0; i<data.length; i+=4) {
        if(data[i+3] == 0) {
            convertedPixels[i/4] = undefined;
            continue;
        }
        convertedPixels[i/4] = [data[i], data[i+1], data[i+2]];
    }
    return convertedPixels;
};

var paletteEntryToStr = function(palette) {
    return palette[0] + "," + palette[1] + "," + palette[2];
};

var paletteToStrArray = function(palette) {
    paletteStr = [];
    for(var i=0; i<palette.length; i++) {
        paletteStr[i] = paletteEntryToStr(palette[i]);
    }
    return paletteStr;
};

var convertRgbToIndex = function(data, palette) {
    paletteStr = paletteToStrArray(palette);
    indexes = [];
    for(var i=0; i<data.length; i++) {
        if(data[i] == undefined) {
            indexes[i] = 255;
            continue;
        }
        var index = paletteStr.indexOf(paletteEntryToStr(data[i]));
        indexes[i] = index;
    }
    return indexes;
};

var convertPalette = function() {
    var palette;
    var reducedImage;

    if(quantizeMethod == QUANTIZE_RGBQUANT) {
        var q = new RgbQuant(opts={colors: 255})
        q.sample(sprayCanvas);
        palette = q.palette(true);
        reducedImage = q.reduce(sprayCanvas, 2); // 2 = indexed array
    }

    if(quantizeMethod == QUANTIZE_MMCQ) {
        imageData = context.getImageData(0, 0, sprayCanvas.width, sprayCanvas.height);
        pixels = convertImageData(imageData.data);
        var q = MMCQ.quantize(pixels, 256);
        
        palette = q.palette();

        var newPixels = pixels.map(function(p) { 
            return q.map(p);
        });

        reducedImage = convertRgbToIndex(newPixels, palette); 
    }

    palette[255] = [0, 0, 255];

    outputPalette(palette);

    for(var i=0; i<reducedImage.length; i++) {

        if(reducedImage[i] == undefined) {
            reducedImage[i] = 255;
        }
    }

    currentSpray = new Spray(sprayCanvas.width, sprayCanvas.height, reducedImage, palette);

    var imageData = context.createImageData(sprayCanvas.width, sprayCanvas.height);
    for(var i=0; i<reducedImage.length; i++) {
        indexVal = reducedImage[i];
        imageData.data[i*4] = palette[indexVal][0];
        imageData.data[i*4+1] = palette[indexVal][1];
        imageData.data[i*4+2] = palette[indexVal][2];
        if(indexVal == 255) {
            imageData.data[i*4+3] = 0;
            continue
        }
        imageData.data[i*4+3] = 255;
    }

    context.clearRect(0, 0, sprayCanvas.width, sprayCanvas.height);
    context.putImageData(imageData, 0, 0);
};

var calculateSizeNeeded = function() {
    return getDirOffset() + DIR_HEADER_LEN;
};

var getMipOffset = function() {
    w = sprayCanvas.width;
    h = sprayCanvas.height;
    return w*h + w/2 * h/2 + w/4 * h/4 + w/8 * h/8;
};

var getDirOffset = function() {
    return WAD_HEADER_LEN + LUMP_HEADER_LEN +  getMipOffset() + RGB_TABLE_W_PADDING_LEN;
};

var writeSprayNameToView = function(view) {
    view.writeChar('{LOGO'); //128-40=88
    view.writeUint32(0, true); // 88-32 = 56
    view.writeUint32(0, true); // 56-32 = 24
    view.writeUint16(0, true); // 24-16 = 8
    view.writeUint8(0, true); // 8-8=0
};

var writeWadHeaderToView = function(view) {
    view.writeString("WAD3");
    view.writeUint32(1, true);
    view.writeUint32(getDirOffset(), true);
};


var writeLumpHeaderToView = function(view) {
    writeSprayNameToView(view);
    view.writeUint32(sprayCanvas.width, true);
    view.writeUint32(sprayCanvas.height, true);
    var mipOffset = LUMP_HEADER_LEN;
    view.writeUint32(mipOffset, true);
    mipOffset += sprayCanvas.width*sprayCanvas.height;
    view.writeUint32(mipOffset, true);
    mipOffset += sprayCanvas.width/2*sprayCanvas.height/2;
    view.writeUint32(mipOffset, true);
    mipOffset += sprayCanvas.width/4*sprayCanvas.height/4;
    view.writeUint32(mipOffset, true);
};

var writeSprayLumpToView = function(view) {
    if(!currentSpray) {
        console.log("No spray data!");
        return false;
    }
    palette = new Array(256);
    for(var i=0;i<palette.length;i++) {
        palette[i] = [0,0,0];
    }

    var tmpPalette = currentSpray.palette;

    for(var i=0; i<tmpPalette.length; i++) {
        if(tmpPalette[i] == undefined) {
            tmpPalette[i] = [0,0,0];
        }
        palette[i] = tmpPalette[i];
    }

    palette[255] = [0, 0, 255];

    reducedImage = currentSpray.indexes;

    for(var i = 0; i < reducedImage.length; i++) {
        var index = reducedImage[i];
        if(index == undefined) {
            index = 255;
        }
        view.writeUint8(index);
    }

    for(var i = 0; i < reducedImage.length/4; i++) {
        var index = reducedImage[i*4];
        if(index == undefined) {
            index = 255;
        }
        view.writeUint8(index);
    }

    for(var i = 0; i < reducedImage.length/16; i++) {
        var index = reducedImage[i*16];
        if(index == undefined) {
            index = 255;
        }
        view.writeUint8(index);
    }

    for(var i = 0; i < reducedImage.length/64; i++) {
        var index = reducedImage[i*64];
        if(index == undefined) {
            index = 255;
        }
        view.writeUint8(index);
    }

    view.writeUint16(256, true);

    for(var i = 0; i < 256; i++) {
        view.writeUint8(palette[i][0]);
        view.writeUint8(palette[i][1]);
        view.writeUint8(palette[i][2]);
    }

    view.writeUint16(0, true);

};

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

var outputPalette = function(palette) {
    paletteCanvas.width = 12 * 16;
    paletteCanvas.height = 12 * 16;
    paletteContext.clearRect(0, 0, paletteCanvas.width, paletteCanvas.height);
    for(var i=0; i<palette.length;i++) {
        if(palette[i] == undefined) continue;
        paletteContext.fillStyle = rgbToHex(palette[i][0], palette[i][1], palette[i][2]);
        var y = Math.floor(i/16) * 12;
        var x = i % 16 * 12;
        paletteContext.fillRect(x,y,x+12,y+12);
    }
};

var writeDirHeaderToView = function(view) {
    view.writeUint32(WAD_HEADER_LEN, true);
    view.writeUint32(getMipOffset() + RGB_TABLE_W_PADDING_LEN + LUMP_HEADER_LEN, true);
    view.writeUint32(getMipOffset() + RGB_TABLE_W_PADDING_LEN + LUMP_HEADER_LEN, true);
    view.writeUint8(0x43, true);
    view.writeUint8(0);
    view.writeUint16(0, true);
    writeSprayNameToView(view);
};

var saveByteArray = function (data, name) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var blob = new Blob(data, {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
    $(a).remove();
};

var saveWad = function() {
    var buff = new ArrayBuffer(calculateSizeNeeded());
    var view = new jDataView(buff);

    writeWadHeaderToView(view);
    writeLumpHeaderToView(view);
    writeSprayLumpToView(view);
    writeDirHeaderToView(view);

    saveByteArray([buff], 'tempdecal.wad');
};

$(function() {
    sprayCanvas = $('#spray-preview')[0];
    imageCanvas = $('#image-input')[0];
    croppedCanvas = $('#cropped-input')[0];
    context = sprayCanvas.getContext("2d");
    imageContext = imageCanvas.getContext("2d");
    paletteCanvas = $('#palette-preview')[0];
    paletteContext = paletteCanvas.getContext("2d");

    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;

    imageContext.webkitImageSmoothingEnabled = false;
    imageContext.mozImageSmoothingEnabled = false;
    imageContext.msImageSmoothingEnabled = false;
    imageContext.imageSmoothingEnabled = false;

    croppedCanvas.getContext("2d").webkitImageSmoothingEnabled = false;
    croppedCanvas.getContext("2d").mozImageSmoothingEnabled = false;
    croppedCanvas.getContext("2d").msImageSmoothingEnabled = false;
    croppedCanvas.getContext("2d").imageSmoothingEnabled = false;

    paletteContext.webkitImageSmoothingEnabled = false;
    paletteContext.mozImageSmoothingEnabled = false;
    paletteContext.msImageSmoothingEnabled = false;
    paletteContext.imageSmoothingEnabled = false;

    cropshop = new CropShop(imageCanvas);
    cropshop.attachPreviewCanvas(croppedCanvas);

    validDimensions = generateValidDimensions();

    $('#crop').click(function(evt) {
        drawImageToSpray(croppedCanvas);
    });

    $('#file-input').change(function(evt){
        var target_file_obj = evt.target.files[0];
        var reader = new FileReader();
        var ext = target_file_obj.name.substr(target_file_obj.name.length - 4).toLowerCase();

        if(ext == ".wad") {
            reader.onload = loadWad;
            reader.readAsBinaryString(target_file_obj);
        } else {
            reader.onload = loadImage;
            reader.readAsDataURL(target_file_obj);
        }
    });

    for(var i = 0; i < validDimensions.length; i++) {
        $('#canvas-size').append($("<option>", {
            value: i,
            text: validDimensions[i][0] + "x" + validDimensions[i][1]
        }));
    }


    $('#canvas-size').change(function(evt) {
        selectDimension(validDimensions[this.value][0], validDimensions[this.value][1]);
    });


    $('#export').click(function() {
        saveWad();
    });

    selectDimension(96, 96);
    $('input[name=quant]').change(function() {
        if($('input[name=quant]:checked').val() == 'rgbquant') {
            quantizeMethod = QUANTIZE_RGBQUANT;
        } else {
            quantizeMethod = QUANTIZE_MMCQ;
        }
        drawImageToSpray(croppedCanvas);
    });
    if($('input[name=quant]:checked').val() == 'rgbquant') {
        quantizeMethod = QUANTIZE_RGBQUANT;
    } else {
        quantizeMethod = QUANTIZE_MMCQ;
    }

    $('input[name=magnify]').change(function() {
        selectDimension(validDimensions[$('#canvas-size').val()][0], validDimensions[$('#canvas-size').val()][1]);
    });

    $('input[name=safe-border]').change(function() {
        transparentBorder = $('input[name=safe-border]:checked').length > 0;
        drawImageToSpray(croppedCanvas);
    });
    transparentBorder = $('input[name=safe-border]:checked').length > 0;

    $('#autosize').click(function() {
        selectBestDimension();
    });

    $('input[name=resize]').change(function() {
        if($('input[name=resize]:checked').val() == 'browser') {
            resizeMethod = RESIZE_BROWSER;
        } else if($('input[name=resize]:checked').val() == 'downscale'){
            resizeMethod = RESIZE_DOWNSCALE;
        } else if($('input[name=resize]:checked').val() == 'hermite'){
            resizeMethod = RESIZE_HERMITE;
        } else {
            resizeMethod = RESIZE_BROWSER_MULTIPLE;
        }
        drawImageToSpray(croppedCanvas);
    });
    if($('input[name=resize]:checked').val() == 'browser') {
        resizeMethod = RESIZE_BROWSER;
    } else if($('input[name=resize]:checked').val() == 'downscale'){
        resizeMethod = RESIZE_DOWNSCALE;
    } else if($('input[name=resize]:checked').val() == 'hermite'){
        resizeMethod = RESIZE_HERMITE;
    } else {
        resizeMethod = RESIZE_BROWSER_MULTIPLE;
    }
    $('input[name=sharpen]').change(function() {
        drawImageToSpray(croppedCanvas);
    });
});


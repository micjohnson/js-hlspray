/*
source: https://github.com/alistairjudson/CropShop

This version has been modified to change default behavior
*/

function CropShop (cropCanvas, resizeDestination){
    this.workCanvas         = document.createElement("canvas");
    this.cropCanvas         = cropCanvas;
    this.startWidth         = cropCanvas.width;
    this.startHeight        = cropCanvas.height;
    this.previewCanvases    = [];
    this.xOffset            = 0;
    this.yOffset            = 0;
    this.scaleFactor        = 1;
    this.selectedArea       = new Rectangle(new Point(0, 0), new Point(0, 0));
    this.callback           = null;
    this.outputFilter       = function(canvas){};
    
    if(typeof resizeDestination == "undefined"){
        resizeDestination = true;
    }
    if(!(cropCanvas instanceof HTMLCanvasElement)){
        throw new Error("Paramater #1 must be a Canvas");
    }
}
CropShop.prototype.setOutputFilter = function(outputFilter){
    this.outputFilter = outputFilter;
    this.servicePreviewCanvases(this.selectedArea);  
};
CropShop.prototype.attachPreviewCanvas = function(previewCanvas){
    var detailedCanvas = new Object();
    detailedCanvas.canvas = previewCanvas;
    detailedCanvas.width = this.workCanvas.width;
    detailedCanvas.height = this.workCanvas.height;
    this.previewCanvases.push(detailedCanvas);
};
CropShop.prototype.servicePreviewCanvases = function(selectedArea){
    for(var i = 0; i < this.previewCanvases.length; i++){
        var canvas = this.previewCanvases[i].canvas;
        canvas.width = this.workCanvas.width;
        canvas.height = this.workCanvas.height;

        if(typeof selectedArea === "undefined" || (selectedArea.width == 0 && selectedArea.height == 0)){
            this.outputToCanvas(this.workCanvas, canvas, true, true);
        }else{
            this.drawSelectedAreaToCanvas(selectedArea, canvas, true, true);            
        }
        if(canvas.width > 0 && canvas.height > 0){
            this.outputFilter(canvas);    
        }


    }
};
CropShop.prototype.output = function(maxWidth, maxHeight){
    var canvas = document.createElement('canvas');
    
    if(typeof maxWidth !== "undefined"){
        canvas.width = maxWidth;
    }else if(typeof this.selectedArea === "undefined" || (this.selectedArea.width == 0 && this.selectedArea.height == 0)){
        canvas.width = this.workCanvas.width;
    }else{
        canvas.width = this.selectedArea.width * this.scaleFactor;
    }
    
    if(typeof maxHeight !== "undefined"){
        canvas.height = maxHeight;
    }else if(typeof this.selectedArea === "undefined" || (this.selectedArea.width == 0 && this.selectedArea.height == 0)){
        canvas.height = this.workCanvas.height;
    }else{
        canvas.height = this.selectedArea.height * this.scaleFactor;
    }
   console.log(canvas.height);
   console.log(canvas.width);
    if(typeof this.selectedArea === "undefined" || (this.selectedArea.width == 0 && this.selectedArea.height == 0)){
        this.outputToCanvas(this.workCanvas, canvas, true, true);
    }else{
        this.drawSelectedAreaToCanvas(this.selectedArea, canvas, true, true);
    }
    if(canvas.width > 0 && canvas.height > 0){
        this.outputFilter(canvas);    
    }
    return canvas.toDataURL();
}
CropShop.prototype.loadImageFromFile = function(input, callback){
    if(input instanceof HTMLInputElement && input.type == "file" && !input.multiple){
        input.onchange = function(){
            var type = "image";
            var file = input.files[0];
            if(file.type.slice(0, type.length) !== type){
                throw new Error("Files selected must be images.");
            }
            var image = new Image();
            image.src = URL.createObjectURL(file);
            image.onload = function(){
                callback(image);
            };
        };        
    }else{
         throw new Error("Input must be a non multiple file input");
    }   
}
CropShop.prototype.loadImageToCanvas = function(image){
    var canvas      = document.createElement("canvas");
    canvas.width    = image.width;
    canvas.height   = image.height;
    var context     = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return canvas;
};
CropShop.prototype.getResizeDimesions = function(width, height, toCanvas, maintainAspect, resizeDestination){
    var fromX   = 0;
    var fromY   = 0;
    var canvasWidth = toCanvas.width;
    var canvasHeight = toCanvas.height;
    
    if(maintainAspect){
        if(width > toCanvas.width){
            var newWidth    = toCanvas.width;
            height          = (newWidth/width) * height;
            width           = newWidth;
        }
        if(height > toCanvas.height){
            var newHeight   = toCanvas.height;
            width           = (newHeight/height) * width;
            height          = newHeight;
        }
    }else{
        width   = toCanvas.width;
        height  = toCanvas.height;
    }
    if(resizeDestination){
        if(width < toCanvas.width){
            canvasWidth  = width;
        }
        if(height < toCanvas.height){
            canvasHeight = height;
        }        
    }else{
        fromX = (toCanvas.width - width)/2;
        fromY = (toCanvas.height - height)/2;
    }
    var output = new Object();
    output.fromX = fromX;
    output.fromY = fromY;
    output.width = width;
    output.height = height;
    output.canvasWidth = canvasWidth;
    output.canvasHeight = canvasHeight;
    return output;    
};
CropShop.prototype.drawSelectedAreaToCanvas = function(selectedArea, toCanvas, maintainAspect, resizeDestination){
    var context = toCanvas.getContext('2d');
    var width   = (selectedArea.width * this.scaleFactor);
    var height  = (selectedArea.height * this.scaleFactor);
    
    var newSizes    = this.getResizeDimesions(width, height, toCanvas, true, true);
    toCanvas.width  = newSizes.canvasWidth;
    toCanvas.height = newSizes.canvasHeight;
    context.drawImage(this.workCanvas, 
                      this.xOffset + (selectedArea.topLeft.x * this.scaleFactor), 
                      this.yOffset + (selectedArea.topLeft.y * this.scaleFactor), 
                      (selectedArea.width * this.scaleFactor), 
                      (selectedArea.height * this.scaleFactor), 
                      newSizes.fromX, 
                      newSizes.fromY, 
                      newSizes.width, 
                      newSizes.height);
};
CropShop.prototype.outputToCanvas = function(fromCanvas, toCanvas, maintainAspect, resizeDestination){
    var width   = fromCanvas.width;
    var height  = fromCanvas.height;
    var newSizes = this.getResizeDimesions(width, height, toCanvas, true, true);
    toCanvas.width = newSizes.canvasWidth;
    toCanvas.height = newSizes.canvasHeight;
    var toContext = toCanvas.getContext("2d");
    toContext.clearRect(0, 0, toCanvas.width, toCanvas.height);
    toContext.drawImage(fromCanvas, newSizes.fromX, newSizes.fromY, newSizes.width, newSizes.height);
    return newSizes;
};
CropShop.prototype.initialize = function(image, callback=null){
    this.workCanvas         = this.loadImageToCanvas(image);
    this.selectedArea       = new Rectangle(new Point(0, 0), new Point(0, 0));
    this.cropCanvas.width   = image.width;
    this.cropCanvas.height  = image.height;
    this.callback = callback;
    var newSizes = this.outputToCanvas(this.workCanvas, this.cropCanvas, true, true);
    this.xOffset = newSizes.fromX;
    this.yOffset = newSizes.fromY;
    this.scaleFactor = (this.workCanvas.width / this.cropCanvas.width);
    this.attachSelectable(this.cropCanvas, function(selectedArea){
        
    });
    this.servicePreviewCanvases(this.selectedArea);
};
CropShop.prototype.resetCropCanvas = function(){
    var context            = this.cropCanvas.getContext("2d");
    this.cropCanvas.width  = this.workCanvas.width;
    this.cropCanvas.height = this.workCanvas.height;
    context.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
    context.beginPath();
    this.outputToCanvas(this.workCanvas, this.cropCanvas, true, true);
};
CropShop.prototype.attachSelectable = function(canvas, selectedCallback){
    var cropshop            = this;
    var mode                = "none"; 
    var downPos             = new Point(0, 0);
    var cursorStyles        = ["nwse-resize", "ns-resize", "nesw-resize", "ew-resize"];
    var areaSelected        = false;
    canvas.onmousedown  = function(e){
        downPos = cropshop.getCursorPosition(e, canvas)
        var pullTab = cropshop.cursorInDragSquare(downPos, cropshop.selectedArea);
        if(pullTab !== -1){
            mode = pullTab.toString();
        }else if(cropshop.isClickInSelectedArea(cropshop.selectedArea, downPos)){
            canvas.style.cursor = "move";
            mode = 'move';
        }else{
            canvas.style.cursor = "crosshair";
            mode = "drag"
        }
        areaSelected = true;
    };
    canvas.onmousemove  = function(e){
        var current = cropshop.getCursorPosition(e, canvas);
        var pullTab = cropshop.cursorInDragSquare(current, cropshop.selectedArea);
        if(pullTab !== -1 && mode == "none" ){
            canvas.style.cursor = cursorStyles[pullTab % 4];
        }else if(cropshop.isClickInSelectedArea(cropshop.selectedArea, current) && mode == "none" ){
            canvas.style.cursor = "move";
        }else if(mode == "none" ){
            canvas.style.cursor = "crosshair";
        } 
        var renderRect = cropshop.selectedArea;
        renderRect = cropshop.rectangleFromMode(mode, downPos, current, cropshop.selectedArea);
        if(areaSelected){
            cropshop.servicePreviewCanvases(renderRect);
            cropshop.renderRectangle(canvas, renderRect);
        }
    };
    canvas.onmouseup    = function(e){
        var upClick = cropshop.getCursorPosition(e, canvas);
        if(downPos.x === upClick.x && downPos.y === upClick.y && mode == "drag"){
            cropshop.resetCropCanvas();
            downPos                 = new Point(0, 0);
            cropshop.selectedArea   = new Rectangle(new Point(0, 0), new Point(0, 0));
            areaSelected            = false;      
            selectedCallback(undefined);  
            cropshop.servicePreviewCanvases(undefined); 
        }else{
            cropshop.selectedArea = cropshop.rectangleFromMode(mode, downPos, upClick, cropshop.selectedArea);
            if(cropshop.selectedArea.width !== 0  && cropshop.selectedArea.height !== 0 ){
                selectedCallback(cropshop.selectedArea);
                cropshop.servicePreviewCanvases(cropshop.selectedArea);                
            }
        }
        mode = "none";
    };
    canvas.onmouseout   = canvas.onmouseup;
};
CropShop.prototype.isClickInSelectedArea = function(selectedArea, point){
    if(point.x < selectedArea.topLeft.x || 
       point.y < selectedArea.topLeft.y || 
       point.x > selectedArea.bottomRight.x || 
       point.y > selectedArea.bottomRight.y){
        return false;
    }else{
        return true;
    }
};
CropShop.prototype.getCursorPosition = function(e, canvas){ 
    var x   = e.clientX - canvas.offsetLeft + window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
    var y   = e.clientY - canvas.offsetTop + window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return new Point(x, y);
};
CropShop.prototype.createStandardRect = function(start, end){
    var topLeft     = new Point(Math.min(start.x, end.x), Math.min(start.y, end.y));
    var bottomRight = new Point(Math.max(start.x, end.x), Math.max(start.y, end.y));
    return new Rectangle(topLeft, bottomRight);
};
CropShop.prototype.renderRectangle = function(canvas, rectangle){
    var context = canvas.getContext('2d');
    this.resetCropCanvas();
    var squares = this.getDragSquares(rectangle);
    context.setLineDash([5, 5]);
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.fillRect(0, 0, canvas.width, rectangle.topLeft.y);
    context.fillRect(0, rectangle.topLeft.y, rectangle.topLeft.x, rectangle.height);
    context.fillRect(rectangle.bottomRight.x, rectangle.topLeft.y, canvas.width - rectangle.bottomRight.x, rectangle.height);
    context.fillRect(0, rectangle.bottomRight.y, canvas.width, canvas.height - rectangle.bottomRight.y);
    context.rect(rectangle.topLeft.x, 
                 rectangle.topLeft.y, 
                 rectangle.width, 
                 rectangle.height);
    context.stroke();
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.setLineDash([]);
    for(var i = 0; i < squares.length; i++){
        var square = squares[i];
        context.rect(square.topLeft.x, square.topLeft.y, square.width, square.height);
        context.fillRect(square.topLeft.x, square.topLeft.y, square.width, square.height);
    } 
    context.stroke();      
};
CropShop.prototype.getDragSquares = function(rectangle){
    var points      = [];
    var squares     = [];
    var squareSize  = 10;
    points.push(rectangle.topLeft);
    points.push(new Point(rectangle.topLeft.x + ((rectangle.bottomRight.x - rectangle.topLeft.x) / 2), rectangle.topLeft.y));
    points.push(new Point(rectangle.bottomRight.x, rectangle.topLeft.y));
    points.push(new Point(rectangle.bottomRight.x, rectangle.topLeft.y - ((rectangle.topLeft.y - rectangle.bottomRight.y) / 2) ));
    points.push(rectangle.bottomRight);
    points.push(new Point(rectangle.topLeft.x + ((rectangle.bottomRight.x - rectangle.topLeft.x) / 2), rectangle.bottomRight.y));
    points.push(new Point(rectangle.topLeft.x, rectangle.bottomRight.y));
    points.push(new Point(rectangle.topLeft.x, rectangle.topLeft.y - ((rectangle.topLeft.y - rectangle.bottomRight.y) / 2) ));
    for(var i = 0; i < points.length; i++){
        var point       = points[i];
        var startPoint  = new Point(point.x - (squareSize/2), point.y - (squareSize/2));
        var endPoint    = new Point(startPoint.x + squareSize, startPoint.y + squareSize);
        squares.push(new Rectangle(startPoint, endPoint));
    } 
    return squares;
};
CropShop.prototype.cursorInDragSquare = function(position, selectedArea){
    var squares = this.getDragSquares(selectedArea);
    for(var i = 0; i < squares.length; i++){
        if(this.isClickInSelectedArea(squares[i], position)){
            return i;
        }
    }
    return -1;        
};
CropShop.prototype.rectangleFromMode = function(mode, downPos, current, selectedArea){
    var outputRect = selectedArea;
    if(mode == "drag"){
        outputRect = this.createStandardRect(downPos, current);
    }else if(mode == "move"){
        outputRect = this.createStandardRect(new Point(current.x + (selectedArea.topLeft.x - downPos.x), 
                                                       current.y + (selectedArea.topLeft.y - downPos.y)),
                                             new Point(current.x + (selectedArea.topLeft.x - downPos.x) + selectedArea.width,
                                                       current.y + (selectedArea.topLeft.y - downPos.y) + selectedArea.height));
    }else if(mode === "0"){
        outputRect = this.createStandardRect(new Point(current.x + (selectedArea.topLeft.x - downPos.x), 
                                                       current.y + (selectedArea.topLeft.y - downPos.y)),
                                             selectedArea.bottomRight);
    }else if(mode == "1"){
        outputRect = this.createStandardRect(new Point(selectedArea.topLeft.x, 
                                                       current.y + (selectedArea.topLeft.y - downPos.y)),
                                             selectedArea.bottomRight);            
    }else if(mode == "2"){
        outputRect = this.createStandardRect(new Point(selectedArea.topLeft.x, 
                                                       current.y + (selectedArea.topLeft.y - downPos.y)),
                                             new Point(current.x + (selectedArea.bottomRight.x - downPos.x),
                                                       selectedArea.bottomRight.y));
    }else if(mode == "3"){
        outputRect = this.createStandardRect(selectedArea.topLeft,
                                             new Point(current.x + selectedArea.width + (selectedArea.topLeft.x - downPos.x),
                                                       selectedArea.bottomRight.y));
    }else if(mode == "4"){
        outputRect = this.createStandardRect(selectedArea.topLeft,
                                             new Point(current.x + (selectedArea.bottomRight.x - downPos.x),
                                                       current.y + (selectedArea.bottomRight.y - downPos.y)));
    }else if(mode == "5"){
        outputRect = this.createStandardRect(selectedArea.topLeft,
                                                    new Point(selectedArea.bottomRight.x, 
                                                              current.y + (selectedArea.bottomRight.y - downPos.y)));
    }else if(mode == "6"){
        outputRect = this.createStandardRect(new Point(current.x + (selectedArea.topLeft.x - downPos.x), 
                                                       selectedArea.topLeft.y),
                                             new Point(selectedArea.bottomRight.x, 
                                                       current.y + (selectedArea.bottomRight.y - downPos.y)));
    }else if(mode == "7"){
        outputRect = this.createStandardRect(new Point(current.x + (selectedArea.topLeft.x - downPos.x), 
                                                       selectedArea.topLeft.y),
                                             selectedArea.bottomRight);           
    }
    return outputRect;    
}
function Point(x, y){
    this.x = x;
    this.y = y;
};
function Rectangle(topLeft, bottomRight){
    this.topLeft        = topLeft;
    this.bottomRight    = bottomRight;
    this.width          = this.bottomRight.x - this.topLeft.x;
    this.height         = this.bottomRight.y - this.topLeft.y;    
};
function Filters(){  
};
Filters.prototype.binarize = function(canvas, threshold){
    var context = canvas.getContext('2d');
    var imagePixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for(var y = 0; y < imagePixels.height; y++){
        for(var x = 0; x < imagePixels.width; x++){
            //here is x and y are multiplied by 4 because every pixel is four bytes: red, green, blue, alpha
            var i = (y * 4) * imagePixels.width + x * 4;
            //compute average value for colors, this will convert it to bw
            var avg = (((imagePixels.data[i]) + (imagePixels.data[i + 1]) + (imagePixels.data[i + 2])) / 3);
            //set values to array
            if(avg > threshold){
                avg = 255;
            }else{
                avg = 0;
            }
            imagePixels.data[i] = avg; 
            imagePixels.data[i + 1] = avg; 
            imagePixels.data[i + 2] = avg;
        }
    }
    context.putImageData(imagePixels, 0, 0, 0, 0, imagePixels.width, imagePixels.height);    
};
const ThreejsHelper = {

    /**
     * return string in the format of "(x, y, z)"
     * @param {THREE.Vector3} pt
     */
    pt2str: function(pt) {
        return "(" + pt.x + ", " + pt.y + ", " + pt.z + ")";
    },

    // https://stackoverflow.com/questions/41509156/three-js-give-particles-round-form
    createDotMaterial: function(color, dotSize = 0.1, bitmapSize = 256) {
        if(color instanceof THREE.Color) {
            color = '#' + color.getHexString();
        }

        const matCanvas = document.createElement('canvas');
        matCanvas.width = matCanvas.height = bitmapSize;
        const matContext = matCanvas.getContext('2d');
        // create texture object from canvas.
        const texture = new THREE.Texture(matCanvas);
        // Draw a circle
        const center = bitmapSize / 2;
        matContext.beginPath();
        matContext.arc(center, center, bitmapSize/2, 0, 2 * Math.PI, false);
        matContext.closePath();
        matContext.fillStyle = color;
        matContext.fill();
        // need to set needsUpdate
        texture.needsUpdate = true;
        // return a texture made from the canvas
        //return texture;
        return new THREE.PointsMaterial({
            size: dotSize,
            sizeAttenuation: true,
            map: texture,
            transparent: true,
            depthWrite: false,
        });
    },

    /*
 Reference: http://stemkoski.github.io/Three.js/Topology-Data.html
 Usage:
     for (var i = 0; i < topo.vertex.length; i++)
    {
        var spritey = makeTextSprite( " " + i + " ", { fontsize: 32, backgroundColor: {r:255, g:100, b:100, a:1} } );
        spritey.position = topo.vertex[i].vector3.clone().multiplyScalar(1.1);
        scene.add( spritey );
    }
 */
    makeTextSprite: function(message, parameters) {
        if ( parameters === undefined ) parameters = {};

        var fontface = parameters.hasOwnProperty("fontface") ?
            parameters["fontface"] : "Arial";

        var fontsize = parameters.hasOwnProperty("fontsize") ?
            parameters["fontsize"] : 18;

        var borderThickness = parameters.hasOwnProperty("borderThickness") ?
            parameters["borderThickness"] : 4;

        var borderColor = parameters.hasOwnProperty("borderColor") ?
            parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };

        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
            parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

        var spriteAlignment = THREE.SpriteAlignment.topLeft;

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;

        // get size data (height depends only on font size)
        var metrics = context.measureText( message );
        var textWidth = metrics.width;

        // background color
        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
            + backgroundColor.b + "," + backgroundColor.a + ")";
        // border color
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
            + borderColor.b + "," + borderColor.a + ")";

        context.lineWidth = borderThickness;
        roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
        // 1.4 is extra height factor for text below baseline: g,j,p,q.

        // text color
        context.fillStyle = "rgba(0, 0, 0, 1.0)";

        context.fillText( message, borderThickness, fontsize + borderThickness);

        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true;

        var spriteMaterial = new THREE.SpriteMaterial(
            { map: texture, useScreenCoordinates: false, alignment: spriteAlignment } );
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(100,50,1.0);
        return sprite;
    }
}

const fs = require( 'fs' );
const path = require( 'path' );
const jimp = require( 'jimp' );
const { SHAPES, isForegroundPixel } = require( './shapeGenerator' );
const { renderEmojiGrid } = require( './emojiRenderer' );

const NAMED_COLORS = {
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    black:       { r: 0, g: 0, b: 0, a: 255 },
    white:       { r: 255, g: 255, b: 255, a: 255 },
    red:         { r: 255, g: 0, b: 0, a: 255 },
    green:       { r: 0, g: 255, b: 0, a: 255 },
    blue:        { r: 0, g: 0, b: 255, a: 255 },
    yellow:      { r: 255, g: 255, b: 0, a: 255 },
    cyan:        { r: 0, g: 255, b: 255, a: 255 },
    magenta:     { r: 255, g: 0, b: 255, a: 255 },
    gray:        { r: 128, g: 128, b: 128, a: 255 },
    orange:      { r: 255, g: 165, b: 0, a: 255 },
    purple:      { r: 128, g: 0, b: 128, a: 255 }
};

/**
 * Parse a color string into an {r,g,b,a} object (0-255 each).
 * Accepts named colors or hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 */
function parseColor( input )
{
    if ( input === null || input === undefined ) return { r: 0, g: 0, b: 0, a: 0 };
    if ( typeof input === 'object' && 'r' in input && 'g' in input && 'b' in input )
    {
        return { r: input.r, g: input.g, b: input.b, a: input.a === undefined ? 255 : input.a };
    }
    if ( typeof input !== 'string' )
    {
        throw new Error( `Invalid color: ${JSON.stringify( input )}` );
    }
    const lower = input.toLowerCase().trim();
    if ( NAMED_COLORS[ lower ] ) return { ...NAMED_COLORS[ lower ] };
    const match = /^#([0-9a-f]{3,8})$/i.exec( lower );
    if ( !match )
    {
        throw new Error( `Invalid color: "${input}"` );
    }
    let hex = match[ 1 ];
    if ( hex.length === 3 || hex.length === 4 )
    {
        hex = hex.split( '' ).map( ( c ) => c + c ).join( '' );
    }
    if ( hex.length !== 6 && hex.length !== 8 )
    {
        throw new Error( `Invalid hex color length: "${input}"` );
    }
    const r = parseInt( hex.substring( 0, 2 ), 16 );
    const g = parseInt( hex.substring( 2, 4 ), 16 );
    const b = parseInt( hex.substring( 4, 6 ), 16 );
    const a = hex.length === 8 ? parseInt( hex.substring( 6, 8 ), 16 ) : 255;
    return { r, g, b, a };
}

/**
 * Standard "source-over" alpha composite of `top` onto `base`.
 * Both args and the result are {r,g,b,a} with 0-255 channels.
 */
function compositePixel( base, top )
{
    if ( top.a === 0 ) return { ...base };
    if ( top.a === 255 && base.a === 0 ) return { ...top };
    const ta = top.a / 255;
    const ba = base.a / 255;
    const outA = ta + ba * ( 1 - ta );
    if ( outA <= 0 ) return { r: 0, g: 0, b: 0, a: 0 };
    const blend = ( tc, bc ) => ( tc * ta + bc * ba * ( 1 - ta ) ) / outA;
    return {
        r: Math.round( blend( top.r, base.r ) ),
        g: Math.round( blend( top.g, base.g ) ),
        b: Math.round( blend( top.b, base.b ) ),
        a: Math.round( outA * 255 )
    };
}

function validateLayer( layer, index )
{
    const errors = [];
    if ( !layer || typeof layer !== 'object' )
    {
        errors.push( `Layer ${index} is not an object.` );
        return errors;
    }
    if ( !SHAPES.includes( layer.shape ) )
    {
        errors.push( `Layer ${index}: shape "${layer.shape}" is not one of ${SHAPES.join( ', ' )}.` );
    }
    if ( layer.shape === 'emoji' && ( !layer.emoji || typeof layer.emoji !== 'string' ) )
    {
        errors.push( `Layer ${index}: emoji shape requires non-empty "emoji" string.` );
    }
    if ( layer.opacity !== undefined && ( typeof layer.opacity !== 'number' || layer.opacity < 0 || layer.opacity > 1 ) )
    {
        errors.push( `Layer ${index}: opacity must be a number between 0 and 1.` );
    }
    for ( const colorKey of [ 'foreground', 'background' ] )
    {
        if ( layer[ colorKey ] !== undefined )
        {
            try { parseColor( layer[ colorKey ] ); }
            catch ( err ) { errors.push( `Layer ${index}: ${colorKey} - ${err.message}` ); }
        }
    }
    return errors;
}

function validateScene( scene )
{
    const errors = [];
    if ( !scene || typeof scene !== 'object' )
    {
        return [ 'Scene must be an object.' ];
    }
    if ( !Number.isInteger( scene.width ) || scene.width <= 0 )
    {
        errors.push( `Scene width must be a positive integer, got: ${scene.width}` );
    }
    if ( !Number.isInteger( scene.height ) || scene.height <= 0 )
    {
        errors.push( `Scene height must be a positive integer, got: ${scene.height}` );
    }
    if ( scene.background !== undefined )
    {
        try { parseColor( scene.background ); }
        catch ( err ) { errors.push( `Scene background - ${err.message}` ); }
    }
    if ( !Array.isArray( scene.layers ) || scene.layers.length === 0 )
    {
        errors.push( 'Scene must have a non-empty "layers" array.' );
    }
    else
    {
        scene.layers.forEach( ( layer, i ) => errors.push( ...validateLayer( layer, i ) ) );
    }
    return errors;
}

function loadScene( filePath )
{
    const raw = fs.readFileSync( filePath, 'utf8' );
    let parsed;
    try { parsed = JSON.parse( raw ); }
    catch ( err ) { throw new Error( `Failed to parse scene JSON "${filePath}": ${err.message}` ); }
    return parsed;
}

/**
 * Render a single layer to an {r,g,b,a} grid of `width` x `height`.
 * Returns a flat Uint8ClampedArray-like Array of length width*height*4.
 */
function renderLayer( layer, width, height )
{
    const fg = parseColor( layer.foreground === undefined ? 'white' : layer.foreground );
    const bg = parseColor( layer.background === undefined ? 'transparent' : layer.background );
    const opacity = layer.opacity === undefined ? 1 : layer.opacity;

    let emojiGrid = null;
    if ( layer.shape === 'emoji' )
    {
        emojiGrid = renderEmojiGrid( layer.emoji, width, height );
    }

    const pixels = new Array( width * height * 4 );
    for ( let y = 0; y < height; y++ )
    {
        for ( let x = 0; x < width; x++ )
        {
            const isFg = isForegroundPixel( x, y, width, height, layer.shape, emojiGrid );
            const c = isFg ? fg : bg;
            const idx = ( y * width + x ) * 4;
            pixels[ idx ]     = c.r;
            pixels[ idx + 1 ] = c.g;
            pixels[ idx + 2 ] = c.b;
            pixels[ idx + 3 ] = Math.round( c.a * opacity );
        }
    }
    return pixels;
}

/**
 * Composite scene layers (bottom-up: first in array is bottom).
 * Returns a flat rgba pixel array.
 */
function compositeScene( scene )
{
    const errors = validateScene( scene );
    if ( errors.length > 0 )
    {
        throw new Error( `Invalid scene:\n  - ${errors.join( '\n  - ' )}` );
    }
    const { width, height } = scene;
    const baseColor = parseColor( scene.background === undefined ? 'transparent' : scene.background );
    const pixels = new Array( width * height * 4 );
    for ( let i = 0; i < width * height; i++ )
    {
        const idx = i * 4;
        pixels[ idx ] = baseColor.r;
        pixels[ idx + 1 ] = baseColor.g;
        pixels[ idx + 2 ] = baseColor.b;
        pixels[ idx + 3 ] = baseColor.a;
    }

    for ( const layer of scene.layers )
    {
        if ( layer.visible === false ) continue;
        const layerPixels = renderLayer( layer, width, height );
        for ( let i = 0; i < width * height; i++ )
        {
            const idx = i * 4;
            const base = { r: pixels[ idx ], g: pixels[ idx + 1 ], b: pixels[ idx + 2 ], a: pixels[ idx + 3 ] };
            const top  = { r: layerPixels[ idx ], g: layerPixels[ idx + 1 ], b: layerPixels[ idx + 2 ], a: layerPixels[ idx + 3 ] };
            const out  = compositePixel( base, top );
            pixels[ idx ]     = out.r;
            pixels[ idx + 1 ] = out.g;
            pixels[ idx + 2 ] = out.b;
            pixels[ idx + 3 ] = out.a;
        }
    }
    return pixels;
}

async function pixelsToJimp( pixels, width, height )
{
    const image = await jimp.create( width, height, 0x00000000 );
    for ( let y = 0; y < height; y++ )
    {
        for ( let x = 0; x < width; x++ )
        {
            const idx = ( y * width + x ) * 4;
            const color = jimp.rgbaToInt( pixels[ idx ], pixels[ idx + 1 ], pixels[ idx + 2 ], pixels[ idx + 3 ] );
            image.setPixelColor( color, x, y );
        }
    }
    return image;
}

async function renderSceneToFile( scene, outputDir )
{
    const pixels = compositeScene( scene );
    const image = await pixelsToJimp( pixels, scene.width, scene.height );
    const name = scene.name || 'scene';
    const outputFile = path.join( outputDir, `${name}_${scene.width}x${scene.height}.png` );
    if ( !fs.existsSync( outputDir ) )
    {
        fs.mkdirSync( outputDir, { recursive: true } );
    }
    await new Promise( ( resolve, reject ) =>
        image.write( outputFile, ( err ) => err ? reject( err ) : resolve() ) );
    return outputFile;
}

module.exports = {
    NAMED_COLORS,
    parseColor,
    compositePixel,
    validateLayer,
    validateScene,
    loadScene,
    renderLayer,
    compositeScene,
    pixelsToJimp,
    renderSceneToFile
};

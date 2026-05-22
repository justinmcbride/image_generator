const fs = require('fs');
const path = require('path');
const jimp = require('jimp');

const { getShape, getPatternPixel } = require('./shapeGenerator');
const { getMask, isInsideMask } = require('./maskGenerator');
const { renderEmojiGrid } = require('./emojiRenderer');
const { parseColor, colorToInt, intToColor } = require('./colorUtils');
const { BLEND_MODES, composite } = require('./blend');

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

function validateScene( scene )
{
    const errors = [];
    if ( !scene || typeof scene !== 'object' )
    {
        errors.push( 'Scene must be a JSON object.' );
        return errors;
    }
    if ( !Number.isInteger( scene.width ) || scene.width <= 0 )
    {
        errors.push( `Scene width must be a positive integer, got: ${scene.width}` );
    }
    if ( !Number.isInteger( scene.height ) || scene.height <= 0 )
    {
        errors.push( `Scene height must be a positive integer, got: ${scene.height}` );
    }
    if ( !Array.isArray( scene.layers ) || scene.layers.length === 0 )
    {
        errors.push( 'Scene must include a non-empty "layers" array.' );
        return errors;
    }
    scene.layers.forEach( ( layer, i ) =>
    {
        const prefix = `layers[${i}]`;
        if ( !layer || typeof layer !== 'object' )
        {
            errors.push( `${prefix} must be an object.` );
            return;
        }
        if ( layer.shape === undefined )
        {
            errors.push( `${prefix}.shape is required.` );
        }
        if ( layer.blend !== undefined && !BLEND_MODES.includes( layer.blend ) )
        {
            errors.push( `${prefix}.blend must be one of ${BLEND_MODES.join( ', ' )}.` );
        }
        if ( layer.opacity !== undefined && ( typeof layer.opacity !== 'number' || layer.opacity < 0 || layer.opacity > 1 ) )
        {
            errors.push( `${prefix}.opacity must be a number in [0, 1].` );
        }
        for ( const key of [ 'fgColor', 'bgColor' ] )
        {
            if ( layer[ key ] !== undefined )
            {
                try { parseColor( layer[ key ] ); }
                catch ( err ) { errors.push( `${prefix}.${key}: ${err.message}` ); }
            }
        }
        if ( ( layer.shape === 'emoji' || layer.mask === 'emoji' ) && !layer.emoji )
        {
            errors.push( `${prefix}.emoji is required when using emoji shape/mask.` );
        }
    } );
    return errors;
}

function loadScene( filePath )
{
    const absolute = path.resolve( filePath );
    const raw = fs.readFileSync( absolute, 'utf8' );
    let scene;
    try { scene = JSON.parse( raw ); }
    catch ( err ) { throw new Error( `Failed to parse scene JSON (${filePath}): ${err.message}` ); }
    return scene;
}

/**
 * Apply inverse 2D affine transform to map output (x, y) → source layer (sx, sy).
 * Transform spec: { rotate?: deg, scale?: number|[sx, sy], offset?: [dx, dy] }
 * Forward: src → out is rotate then scale then translate around image center.
 * We invert to sample.
 */
function sampleSourceCoord( x, y, width, height, transform )
{
    if ( !transform ) return { sx: x, sy: y };

    const cx = width / 2;
    const cy = height / 2;

    const dx = ( transform.offset && transform.offset[ 0 ] ) || 0;
    const dy = ( transform.offset && transform.offset[ 1 ] ) || 0;

    let scaleX = 1, scaleY = 1;
    if ( typeof transform.scale === 'number' )
    {
        scaleX = transform.scale; scaleY = transform.scale;
    }
    else if ( Array.isArray( transform.scale ) )
    {
        scaleX = transform.scale[ 0 ] || 1;
        scaleY = transform.scale[ 1 ] || 1;
    }
    if ( scaleX === 0 || scaleY === 0 ) return null;

    const angleRad = ( ( transform.rotate || 0 ) * Math.PI ) / 180;

    // Inverse: subtract translation, then unrotate around center, then unscale.
    const ux = x - dx - cx;
    const uy = y - dy - cy;
    const cos = Math.cos( -angleRad );
    const sin = Math.sin( -angleRad );
    const rx = ux * cos - uy * sin;
    const ry = ux * sin + uy * cos;
    const sx = Math.round( rx / scaleX + cx );
    const sy = Math.round( ry / scaleY + cy );
    return { sx, sy };
}

async function renderScene( scene )
{
    const errs = validateScene( scene );
    if ( errs.length > 0 ) throw new Error( errs.join( '; ' ) );

    const width = scene.width;
    const height = scene.height;
    const background = scene.background ? parseColor( scene.background ) : TRANSPARENT;

    // Initialize canvas buffer of plain RGBA objects.
    const buffer = new Array( width * height );
    for ( let i = 0; i < buffer.length; i++ ) buffer[ i ] = { ...background };

    for ( const layer of scene.layers )
    {
        const shape = getShape( layer.shape );
        const mask = getMask( layer.mask );
        const fg = parseColor( layer.fgColor || '#00ff00' );
        const bg = parseColor( layer.bgColor || 'transparent' );
        const blend = layer.blend || 'normal';
        const opacity = layer.opacity !== undefined ? layer.opacity : 1;

        let emojiGrid = null;
        if ( shape === 'emoji' || mask === 'emoji' )
        {
            emojiGrid = renderEmojiGrid( layer.emoji, width, height );
        }

        for ( let y = 0; y < height; y++ )
        {
            for ( let x = 0; x < width; x++ )
            {
                const src = sampleSourceCoord( x, y, width, height, layer.transform );
                if ( !src ) continue;
                const { sx, sy } = src;
                let pixel;
                if ( sx < 0 || sy < 0 || sx >= width || sy >= height )
                {
                    // Outside source — treat as transparent so background shows through.
                    pixel = { ...TRANSPARENT };
                }
                else
                {
                    pixel = getPatternPixel( sx, sy, width, height, shape, fg, bg, emojiGrid, layer.patternOptions );
                    if ( mask && !isInsideMask( sx, sy, width, height, mask, emojiGrid ) )
                    {
                        pixel = { ...TRANSPARENT };
                    }
                }
                const idx = y * width + x;
                buffer[ idx ] = composite( buffer[ idx ], pixel, blend, opacity );
            }
        }
    }

    const image = await jimp.create( width, height );
    for ( let y = 0; y < height; y++ )
    {
        for ( let x = 0; x < width; x++ )
        {
            image.setPixelColor( colorToInt( buffer[ y * width + x ] ), x, y );
        }
    }
    return image;
}

async function generateSceneImage( filePath, outputOverride )
{
    const scene = loadScene( filePath );
    const image = await renderScene( scene );
    const baseName = scene.output || `${path.basename( filePath, path.extname( filePath ) )}.png`;
    const outputFilename = outputOverride || ( path.isAbsolute( baseName ) ? baseName : path.join( 'output', baseName ) );
    const outputDir = path.dirname( outputFilename );
    if ( outputDir && !fs.existsSync( outputDir ) )
    {
        fs.mkdirSync( outputDir, { recursive: true } );
    }
    await new Promise( ( resolve, reject ) => image.write( outputFilename, ( err ) => err ? reject( err ) : resolve() ) );
    return outputFilename;
}

module.exports = {
    validateScene,
    loadScene,
    renderScene,
    generateSceneImage,
    sampleSourceCoord
};

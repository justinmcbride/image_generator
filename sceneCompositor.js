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

const BLEND_MODES = [ 'normal', 'multiply', 'screen', 'add', 'darken', 'lighten' ];

function clamp255( v )
{
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

function blendChannel( base, top, mode )
{
    switch ( mode )
    {
        case 'multiply': return Math.round( base * top / 255 );
        case 'screen':   return Math.round( 255 - ( ( 255 - base ) * ( 255 - top ) ) / 255 );
        case 'add':      return clamp255( base + top );
        case 'darken':   return Math.min( base, top );
        case 'lighten':  return Math.max( base, top );
        case 'normal':
        default:         return top;
    }
}

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
    if ( layer.blendMode !== undefined && !BLEND_MODES.includes( layer.blendMode ) )
    {
        errors.push( `Layer ${index}: blendMode "${layer.blendMode}" is not one of ${BLEND_MODES.join( ', ' )}.` );
    }
    if ( layer.transform !== undefined )
    {
        if ( typeof layer.transform !== 'object' || layer.transform === null )
        {
            errors.push( `Layer ${index}: transform must be an object.` );
        }
        else
        {
            for ( const key of [ 'rotate', 'scale', 'scaleX', 'scaleY', 'offsetX', 'offsetY' ] )
            {
                if ( layer.transform[ key ] !== undefined && typeof layer.transform[ key ] !== 'number' )
                {
                    errors.push( `Layer ${index}: transform.${key} must be a number.` );
                }
            }
            if ( layer.transform.scaleX !== undefined && layer.transform.scaleX === 0 )
            {
                errors.push( `Layer ${index}: transform.scaleX cannot be zero.` );
            }
            if ( layer.transform.scaleY !== undefined && layer.transform.scaleY === 0 )
            {
                errors.push( `Layer ${index}: transform.scaleY cannot be zero.` );
            }
            if ( layer.transform.scale !== undefined && layer.transform.scale === 0 )
            {
                errors.push( `Layer ${index}: transform.scale cannot be zero.` );
            }
        }
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
    if ( scene.animation !== undefined )
    {
        if ( typeof scene.animation !== 'object' || scene.animation === null )
        {
            errors.push( 'Scene animation must be an object.' );
        }
        else
        {
            if ( !Number.isInteger( scene.animation.frames ) || scene.animation.frames <= 0 )
            {
                errors.push( `Scene animation.frames must be a positive integer, got: ${scene.animation.frames}` );
            }
            if ( scene.animation.fps !== undefined &&
                ( typeof scene.animation.fps !== 'number' || scene.animation.fps <= 0 ) )
            {
                errors.push( `Scene animation.fps must be a positive number.` );
            }
        }
    }
    if ( !Array.isArray( scene.layers ) || scene.layers.length === 0 )
    {
        errors.push( 'Scene must have a non-empty "layers" array.' );
    }
    else
    {
        scene.layers.forEach( ( layer, i ) =>
        {
            errors.push( ...validateLayer( layer, i ) );
            if ( layer && Array.isArray( layer.keyframes ) )
            {
                const totalFrames = scene.animation && scene.animation.frames;
                layer.keyframes.forEach( ( kf, j ) =>
                {
                    if ( !kf || typeof kf !== 'object' )
                    {
                        errors.push( `Layer ${i} keyframe ${j} is not an object.` );
                        return;
                    }
                    if ( !Number.isInteger( kf.frame ) || kf.frame < 0 )
                    {
                        errors.push( `Layer ${i} keyframe ${j}: frame must be a non-negative integer.` );
                    }
                    else if ( totalFrames && kf.frame >= totalFrames )
                    {
                        errors.push( `Layer ${i} keyframe ${j}: frame ${kf.frame} is out of range (0..${totalFrames - 1}).` );
                    }
                    if ( kf.easing !== undefined && !EASINGS[ kf.easing ] )
                    {
                        errors.push( `Layer ${i} keyframe ${j}: easing "${kf.easing}" is not one of ${Object.keys( EASINGS ).join( ', ' )}.` );
                    }
                } );
            }
            else if ( layer && layer.keyframes !== undefined && !Array.isArray( layer.keyframes ) )
            {
                errors.push( `Layer ${i}: keyframes must be an array.` );
            }
        } );
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
 * Resolve a layer's transform into normalized parameters and a precomputed
 * inverse-transform sampler. Returned sampler maps an output (x,y) to the
 * source-coord (sx,sy) to look up in the un-transformed shape grid.
 */
function buildSampler( transform, width, height )
{
    const t = transform || {};
    const rotateDeg = t.rotate || 0;
    const scaleX = t.scaleX !== undefined ? t.scaleX : ( t.scale !== undefined ? t.scale : 1 );
    const scaleY = t.scaleY !== undefined ? t.scaleY : ( t.scale !== undefined ? t.scale : 1 );
    const offsetX = t.offsetX || 0;
    const offsetY = t.offsetY || 0;
    const rotateRad = -rotateDeg * Math.PI / 180; // inverse rotation
    const cosA = Math.cos( rotateRad );
    const sinA = Math.sin( rotateRad );
    const cx = width / 2;
    const cy = height / 2;
    const identity = rotateDeg === 0 && scaleX === 1 && scaleY === 1 && offsetX === 0 && offsetY === 0;

    return function sample( x, y )
    {
        if ( identity ) return { x, y };
        const px = x - cx - offsetX;
        const py = y - cy - offsetY;
        const rx = px * cosA - py * sinA;
        const ry = px * sinA + py * cosA;
        return {
            x: rx / scaleX + cx,
            y: ry / scaleY + cy
        };
    };
}

/**
 * Render a single layer to an {r,g,b,a} grid of `width` x `height`.
 * Applies transform (rotate/scale/offset) via inverse sampling.
 * Returns a flat Array of length width*height*4.
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

    const sample = buildSampler( layer.transform, width, height );

    const pixels = new Array( width * height * 4 );
    for ( let y = 0; y < height; y++ )
    {
        for ( let x = 0; x < width; x++ )
        {
            const src = sample( x, y );
            const sx = Math.round( src.x );
            const sy = Math.round( src.y );
            let isFg = false;
            if ( sx >= 0 && sx < width && sy >= 0 && sy < height )
            {
                isFg = isForegroundPixel( sx, sy, width, height, layer.shape, emojiGrid );
            }
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
        const blendMode = layer.blendMode || 'normal';
        for ( let i = 0; i < width * height; i++ )
        {
            const idx = i * 4;
            const base = { r: pixels[ idx ], g: pixels[ idx + 1 ], b: pixels[ idx + 2 ], a: pixels[ idx + 3 ] };
            const top  = { r: layerPixels[ idx ], g: layerPixels[ idx + 1 ], b: layerPixels[ idx + 2 ], a: layerPixels[ idx + 3 ] };
            let effectiveTop = top;
            if ( blendMode !== 'normal' && top.a > 0 && base.a > 0 )
            {
                effectiveTop = {
                    r: blendChannel( base.r, top.r, blendMode ),
                    g: blendChannel( base.g, top.g, blendMode ),
                    b: blendChannel( base.b, top.b, blendMode ),
                    a: top.a
                };
            }
            const out  = compositePixel( base, effectiveTop );
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

const EASINGS = {
    linear:    ( t ) => t,
    easeIn:    ( t ) => t * t,
    easeOut:   ( t ) => 1 - ( 1 - t ) * ( 1 - t ),
    easeInOut: ( t ) => t < 0.5 ? 2 * t * t : 1 - 2 * ( 1 - t ) * ( 1 - t )
};

function lerp( a, b, t )
{
    return a + ( b - a ) * t;
}

function lerpColor( a, b, t )
{
    return {
        r: Math.round( lerp( a.r, b.r, t ) ),
        g: Math.round( lerp( a.g, b.g, t ) ),
        b: Math.round( lerp( a.b, b.b, t ) ),
        a: Math.round( lerp( a.a, b.a, t ) )
    };
}

const NUMERIC_KEYS = [ 'opacity' ];
const TRANSFORM_KEYS = [ 'rotate', 'scale', 'scaleX', 'scaleY', 'offsetX', 'offsetY' ];
const COLOR_KEYS = [ 'foreground', 'background' ];

/**
 * Resolve the interpolated layer state at a given frame.
 * For each animatable property, find the surrounding two keyframes
 * (by frame index) and lerp between them using the easing of the
 * keyframe being eased FROM. Values not present in any keyframe
 * fall through to the layer's static value.
 */
function resolveLayerAtFrame( layer, frame )
{
    const kfs = Array.isArray( layer.keyframes ) ? layer.keyframes.slice().sort( ( a, b ) => a.frame - b.frame ) : [];
    if ( kfs.length === 0 ) return layer;

    function findPair( has )
    {
        let before = null;
        let after = null;
        for ( const kf of kfs )
        {
            if ( !has( kf ) ) continue;
            if ( kf.frame <= frame ) before = kf;
            if ( kf.frame >= frame && after === null ) after = kf;
        }
        return { before, after };
    }

    function interpolateNumber( getter )
    {
        const { before, after } = findPair( ( kf ) => getter( kf ) !== undefined );
        if ( before === null && after === null ) return undefined;
        if ( before === null ) return getter( after );
        if ( after === null || before === after ) return getter( before );
        const span = after.frame - before.frame;
        const localT = span === 0 ? 1 : ( frame - before.frame ) / span;
        const eased = ( EASINGS[ before.easing ] || EASINGS.linear )( localT );
        return lerp( getter( before ), getter( after ), eased );
    }

    function interpolateColor( key )
    {
        const { before, after } = findPair( ( kf ) => kf[ key ] !== undefined );
        if ( before === null && after === null ) return undefined;
        if ( before === null ) return parseColor( after[ key ] );
        if ( after === null || before === after ) return parseColor( before[ key ] );
        const span = after.frame - before.frame;
        const localT = span === 0 ? 1 : ( frame - before.frame ) / span;
        const eased = ( EASINGS[ before.easing ] || EASINGS.linear )( localT );
        return lerpColor( parseColor( before[ key ] ), parseColor( after[ key ] ), eased );
    }

    const out = { ...layer };
    delete out.keyframes;

    for ( const key of NUMERIC_KEYS )
    {
        const v = interpolateNumber( ( kf ) => kf[ key ] );
        if ( v !== undefined ) out[ key ] = v;
    }
    // transforms: shallow-merge static + interpolated
    const mergedTransform = { ...( layer.transform || {} ) };
    let anyTransform = false;
    for ( const tkey of TRANSFORM_KEYS )
    {
        const v = interpolateNumber( ( kf ) => kf.transform && kf.transform[ tkey ] );
        if ( v !== undefined )
        {
            mergedTransform[ tkey ] = v;
            anyTransform = true;
        }
    }
    if ( anyTransform || layer.transform )
    {
        out.transform = mergedTransform;
    }
    for ( const ckey of COLOR_KEYS )
    {
        const v = interpolateColor( ckey );
        if ( v !== undefined ) out[ ckey ] = v;
    }
    return out;
}

/**
 * Produce a static scene snapshot for a single frame (no animation/keyframes).
 */
function resolveSceneAtFrame( scene, frame )
{
    const snapshot = { ...scene };
    delete snapshot.animation;
    snapshot.layers = scene.layers.map( ( layer ) => resolveLayerAtFrame( layer, frame ) );
    return snapshot;
}

/**
 * Render every frame in the animation and write a frame sequence plus a
 * horizontal filmstrip PNG. Non-animated scenes return a single frame.
 */
async function renderAnimation( scene, outputDir )
{
    const errors = validateScene( scene );
    if ( errors.length > 0 )
    {
        throw new Error( `Invalid scene:\n  - ${errors.join( '\n  - ' )}` );
    }
    const name = scene.name || 'scene';
    const totalFrames = scene.animation && scene.animation.frames ? scene.animation.frames : 1;
    const frameDir = path.join( outputDir, `${name}_frames` );
    if ( !fs.existsSync( frameDir ) )
    {
        fs.mkdirSync( frameDir, { recursive: true } );
    }

    const pad = String( totalFrames - 1 ).length;
    const frameFiles = [];
    const framePixels = [];

    for ( let f = 0; f < totalFrames; f++ )
    {
        const snapshot = resolveSceneAtFrame( scene, f );
        const px = compositeScene( snapshot );
        framePixels.push( px );
        const image = await pixelsToJimp( px, scene.width, scene.height );
        const frameName = `frame_${String( f ).padStart( pad, '0' )}.png`;
        const fp = path.join( frameDir, frameName );
        await new Promise( ( resolve, reject ) =>
            image.write( fp, ( err ) => err ? reject( err ) : resolve() ) );
        frameFiles.push( fp );
    }

    // Build a horizontal filmstrip of all frames.
    const stripWidth = scene.width * totalFrames;
    const stripImage = await jimp.create( stripWidth, scene.height, 0x00000000 );
    for ( let f = 0; f < totalFrames; f++ )
    {
        const px = framePixels[ f ];
        const xOffset = f * scene.width;
        for ( let y = 0; y < scene.height; y++ )
        {
            for ( let x = 0; x < scene.width; x++ )
            {
                const idx = ( y * scene.width + x ) * 4;
                const color = jimp.rgbaToInt( px[ idx ], px[ idx + 1 ], px[ idx + 2 ], px[ idx + 3 ] );
                stripImage.setPixelColor( color, xOffset + x, y );
            }
        }
    }
    const stripFile = path.join( outputDir, `${name}_filmstrip_${totalFrames}x.png` );
    await new Promise( ( resolve, reject ) =>
        stripImage.write( stripFile, ( err ) => err ? reject( err ) : resolve() ) );

    return { frameDir, frameFiles, filmstrip: stripFile, frameCount: totalFrames };
}

module.exports = {
    NAMED_COLORS,
    BLEND_MODES,
    EASINGS,
    blendChannel,
    parseColor,
    compositePixel,
    buildSampler,
    validateLayer,
    validateScene,
    loadScene,
    renderLayer,
    compositeScene,
    pixelsToJimp,
    renderSceneToFile,
    resolveLayerAtFrame,
    resolveSceneAtFrame,
    renderAnimation
};

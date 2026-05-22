const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const { getShape, isForegroundPixel, getPatternPixel } = require('./shapeGenerator');
const { getMask, getMaskColor, isInsideMask } = require('./maskGenerator');
const { renderEmojiGrid } = require('./emojiRenderer');
const { parseColor, colorToInt } = require('./colorUtils');

const DEFAULT_BACKGROUND = { r: 0, g: 0, b: 0, a: 255 };
const DEFAULT_FOREGROUND = { r: 0, g: 255, b: 0, a: 255 };

const MASK_COLOR_VALUES = {
    black: jimp.rgbaToInt( 0, 0, 0, 255 ),
    white: jimp.rgbaToInt( 255, 255, 255, 255 ),
    transparent: jimp.rgbaToInt( 0, 0, 0, 0 )
};

function validateOptions( options )
{
    const errors = [];
    if ( options.width === undefined || options.width === null || isNaN( options.width ) )
    {
        errors.push( 'Width (-w, --width) is required and must be a number.' );
    }
    else if ( !Number.isInteger( options.width ) || options.width <= 0 )
    {
        errors.push( `Width must be a positive integer, got: ${options.width}` );
    }

    if ( options.height === undefined || options.height === null || isNaN( options.height ) )
    {
        errors.push( 'Height (-h, --height) is required and must be a number.' );
    }
    else if ( !Number.isInteger( options.height ) || options.height <= 0 )
    {
        errors.push( `Height must be a positive integer, got: ${options.height}` );
    }

    if ( ( options.shape === 'emoji' || options.mask === 'emoji' ) && !options.emoji )
    {
        errors.push( 'The --emoji option is required when using emoji shape or mask.' );
    }

    for ( const key of [ 'fgColor', 'bgColor' ] )
    {
        if ( options[ key ] !== undefined && options[ key ] !== null )
        {
            try { parseColor( options[ key ] ); }
            catch ( err ) { errors.push( err.message ); }
        }
    }

    return errors;
}

async function generateImage( options )
{
    const width = options.width;
    const height = options.height;
    const shape = getShape( options.shape );
    const mask = getMask( options.mask );
    const maskColorName = getMaskColor( options.maskColor );
    const maskColorValue = MASK_COLOR_VALUES[ maskColorName ];
    const emoji = options.emoji;

    const fg = options.fgColor ? parseColor( options.fgColor ) : DEFAULT_FOREGROUND;
    const bg = options.bgColor ? parseColor( options.bgColor ) : DEFAULT_BACKGROUND;
    const FOREGROUND_COLOR = colorToInt( fg );
    const BACKGROUND_COLOR = colorToInt( bg );

    let emojiGrid = null;
    if ( shape === 'emoji' || mask === 'emoji' )
    {
        emojiGrid = renderEmojiGrid( emoji, width, height );
    }

    const shapeName = shape === 'emoji' ? `emoji_${emoji}` : shape;
    const maskName = mask === 'emoji' ? `emoji_${emoji}` : mask;
    const maskSuffix = mask ? `_${maskName}_${maskColorName}` : '';
    const outputFilename = `output/${shapeName}_1px_${width}x${height}${maskSuffix}.png`;

    const outputDir = path.dirname( outputFilename );
    if ( !fs.existsSync( outputDir ) )
    {
        fs.mkdirSync( outputDir, { recursive: true } );
    }

    const image = await jimp.create( width, height, BACKGROUND_COLOR );

    for ( let x = 0; x < width; x++ )
    {
        for ( let y = 0; y < height; y++ )
        {
            const pixel = getPatternPixel( x, y, width, height, shape, fg, bg, emojiGrid, options.patternOptions );
            image.setPixelColor( colorToInt( pixel ), x, y );
        }
    }

    if ( mask )
    {
        for ( let x = 0; x < width; x++ )
        {
            for ( let y = 0; y < height; y++ )
            {
                if ( !isInsideMask( x, y, width, height, mask, emojiGrid ) )
                {
                    image.setPixelColor( maskColorValue, x, y );
                }
            }
        }
    }

    await new Promise( ( resolve, reject ) => image.write( outputFilename, ( err ) => err ? reject( err ) : resolve() ) );
    return outputFilename;
}

module.exports = {
    validateOptions,
    generateImage
};

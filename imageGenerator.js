const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const { getShape, isForegroundPixel } = require('./shapeGenerator');
const { getMask, getMaskColor, isInsideMask } = require('./maskGenerator');

const BACKGROUND_COLOR = jimp.rgbaToInt( 0, 0, 0, 255 );
const FOREGROUND_COLOR = jimp.rgbaToInt( 0, 255, 0, 255 );

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
    const maskSuffix = mask ? `_${mask}_${maskColorName}` : '';
    const outputFilename = `output/${shape}_1px_${width}x${height}${maskSuffix}.png`;

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
            const color = isForegroundPixel( x, y, width, height, shape )
                ? FOREGROUND_COLOR
                : BACKGROUND_COLOR;
            image.setPixelColor( color, x, y );
        }
    }

    if ( mask )
    {
        for ( let x = 0; x < width; x++ )
        {
            for ( let y = 0; y < height; y++ )
            {
                if ( !isInsideMask( x, y, width, height, mask ) )
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

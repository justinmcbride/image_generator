const program = require('commander');
const jimp = require('jimp');
const { SHAPES, getShape, isForegroundPixel } = require('./shapeGenerator');
const { MASKS, MASK_COLORS, getMask, getMaskColor, isInsideMask } = require('./maskGenerator');

const COLOR_BLACK = jimp.rgbaToInt( 0, 0, 0, 255 );
const COLOR_WHITE = jimp.rgbaToInt( 255, 255, 255, 255 );

const COLOR_RED = jimp.rgbaToInt( 255, 0 , 0, 255 );
const COLOR_GREEN = jimp.rgbaToInt( 0, 255, 0, 255 );
const COLOR_BLUE = jimp.rgbaToInt( 0, 0 , 255, 255 );


const BACKGROUND_COLOR = COLOR_BLACK;
const FOREGROUND_COLOR = COLOR_GREEN;
const BASE_COLOR = COLOR_RED;

const BOX_SIZE = 1;



async function main()
{
    const IMAGE_WIDTH = program.width;
    const IMAGE_HEIGHT = program.height;
    const GRID_WIDTH = IMAGE_WIDTH / BOX_SIZE;
    const GRID_HEIGHT = IMAGE_HEIGHT / BOX_SIZE;
    const SHAPE = getShape( program.shape );
    const MASK = getMask( program.mask );
    const MASK_COLOR_NAME = getMaskColor( program.maskColor );
    const MASK_COLOR_VALUE = {
        black: jimp.rgbaToInt( 0, 0, 0, 255 ),
        white: jimp.rgbaToInt( 255, 255, 255, 255 ),
        transparent: jimp.rgbaToInt( 0, 0, 0, 0 )
    }[ MASK_COLOR_NAME ];
    const MASK_SUFFIX = MASK ? `_${MASK}_${MASK_COLOR_NAME}` : '';
    const OUTPUT_FILENAME = `output/${SHAPE}_${BOX_SIZE}px_${IMAGE_WIDTH}x${IMAGE_HEIGHT}${MASK_SUFFIX}.png`;
    try
    {        
        const newImage = await jimp.create( IMAGE_WIDTH, IMAGE_HEIGHT, BASE_COLOR );

        for ( let w = 0; w < GRID_WIDTH; w++ )
        {
            for ( let h = 0; h < GRID_HEIGHT; h++ )
            {
                let CURRENT_COLOR = BACKGROUND_COLOR;
                if ( isForegroundPixel( w, h, GRID_WIDTH, GRID_HEIGHT, SHAPE ) ) CURRENT_COLOR = FOREGROUND_COLOR;

                for ( let i = 0; i < BOX_SIZE; i++ )
                {
                    for ( let j = 0; j < BOX_SIZE; j++ )
                    {
                        newImage.setPixelColor( CURRENT_COLOR, w*BOX_SIZE+i, h*BOX_SIZE+j );
                    }
                }
                
            }
        }
        if ( MASK )
        {
            for ( let x = 0; x < IMAGE_WIDTH; x++ )
            {
                for ( let y = 0; y < IMAGE_HEIGHT; y++ )
                {
                    if ( !isInsideMask( x, y, IMAGE_WIDTH, IMAGE_HEIGHT, MASK ) )
                    {
                        newImage.setPixelColor( MASK_COLOR_VALUE, x, y );
                    }
                }
            }
        }

        await new Promise( ( resolve, reject ) => newImage.write( OUTPUT_FILENAME, ( err ) => err ? reject( err ) : resolve() ) );
    }
    catch (err)
    {
        console.error( err );
    }
}

program
  .version('0.1.0')
  .option('-w, --width <n>', 'Output width', parseInt )
  .option('-h, --height <n>', 'Output height', parseInt )
  .option('-s, --shape <shape>', `Shape pattern (${SHAPES.join(', ')})`, 'checkers')
  .option('-m, --mask <mask>', `Mask shape (${MASKS.join(', ')})`)
  .option('--mask-color <color>', `Color outside mask (${MASK_COLORS.join(', ')})`, 'black')
  .parse(process.argv);

main();

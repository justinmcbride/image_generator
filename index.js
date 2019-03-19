const program = require('commander');
const jimp = require('jimp');

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
    const OUTPUT_FILENAME = `output/checkers_${BOX_SIZE}px_${IMAGE_WIDTH}x${IMAGE_HEIGHT}.png`;
    try
    {        
        const newImage = await new jimp( IMAGE_WIDTH, IMAGE_HEIGHT, BASE_COLOR );

        for ( let w = 0; w < ( IMAGE_WIDTH / BOX_SIZE ); w++ )
        {
            for ( let h = 0; h < ( IMAGE_HEIGHT / BOX_SIZE ); h++ )
            {
                let CURRENT_COLOR = BACKGROUND_COLOR;
                if ( ( w + h ) % 2 ) CURRENT_COLOR = FOREGROUND_COLOR;

                for ( let i = 0; i < BOX_SIZE; i++ )
                {
                    for ( let j = 0; j < BOX_SIZE; j++ )
                    {
                        newImage.setPixelColor( CURRENT_COLOR, w*BOX_SIZE+i, h*BOX_SIZE+j );
                    }
                }
                
            }
        }
        newImage.write( OUTPUT_FILENAME );
    }
    catch (err)
    {
        console.error( err );
    }
}

program
  .version('0.1.0')
  .option('-w <n>', 'Output width', parseInt )
  .option('-h <n>', 'Output height', parseInt )
  .parse(process.argv);

main();
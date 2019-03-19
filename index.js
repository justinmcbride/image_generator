const jimp = require('jimp');

const COLOR_BLACK = jimp.rgbaToInt( 0, 0, 0, 255 );
const COLOR_WHITE = jimp.rgbaToInt( 255, 255, 255, 255 );

const COLOR_RED = jimp.rgbaToInt( 255, 0 , 0, 255 );
const COLOR_GREEN = jimp.rgbaToInt( 0, 255, 0, 255 );
const COLOR_BLUE = jimp.rgbaToInt( 0, 0 , 255, 255 );

const IMAGE_WIDTH = 1000;
const IMAGE_HEIGHT = 1000;
const OUTPUT_FILENAME = "output/output.png";

const BACKGROUND_COLOR = COLOR_BLACK;
const FOREGROUND_COLOR = COLOR_GREEN;
const BASE_COLOR = COLOR_RED;

const BOX_SIZE = 50;

async function main()
{
    try
    {        
        const newImage = await new jimp( IMAGE_WIDTH, IMAGE_HEIGHT, BASE_COLOR );

        const numberBoxesWide = IMAGE_WIDTH / BOX_SIZE;
        for ( let w = 0; w < numberBoxesWide; w += 1 )
        {
            const numberBoxesHigh = IMAGE_HEIGHT / BOX_SIZE;
            for ( let h = 0; h < numberBoxesHigh; h += 1 )
            {
                let CURRENT_COLOR = BASE_COLOR;
            
                if ( ( w + h ) % 2 ) CURRENT_COLOR = FOREGROUND_COLOR;
                else CURRENT_COLOR = BACKGROUND_COLOR; 

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

main();
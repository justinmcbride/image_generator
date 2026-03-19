const program = require('commander');
const { SHAPES } = require('./shapeGenerator');
const { MASKS, MASK_COLORS } = require('./maskGenerator');
const { validateOptions, generateImage } = require('./imageGenerator');

async function main()
{
    const options = {
        width: program.width,
        height: program.height,
        shape: program.shape,
        mask: program.mask,
        maskColor: program.maskColor
    };

    const errors = validateOptions( options );
    if ( errors.length > 0 )
    {
        errors.forEach( ( err ) => console.error( `Error: ${err}` ) );
        process.exitCode = 1;
        return;
    }

    try
    {
        const outputFile = await generateImage( options );
        console.log( `Generated: ${outputFile}` );
    }
    catch ( err )
    {
        console.error( err );
        process.exitCode = 1;
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

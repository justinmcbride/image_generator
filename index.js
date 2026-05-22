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
        maskColor: program.maskColor,
        emoji: program.emoji,
        fgColor: program.fgColor,
        bgColor: program.bgColor,
        scene: program.scene
    };

    const errors = validateOptions( options );
    if ( errors.length > 0 )
    {
        errors.forEach( ( err ) => console.error( `❌ Error: ${err}` ) );
        process.exitCode = 1;
        return;
    }

    try
    {
        console.log( '🎨 Generating image...' );
        const outputFile = await generateImage( options );
        console.log( `✅ Generated: ${outputFile}` );
    }
    catch ( err )
    {
        console.error( `❌ ${err}` );
        process.exitCode = 1;
    }
}

program
  .version('0.2.0')
  .option('-w, --width <n>', 'Output width', parseInt )
  .option('-h, --height <n>', 'Output height', parseInt )
  .option('-s, --shape <shape>', `Shape pattern (${SHAPES.join(', ')})`, 'checkers')
  .option('-m, --mask <mask>', `Mask shape (${MASKS.join(', ')})`)
  .option('--mask-color <color>', `Color outside mask (${MASK_COLORS.join(', ')})`, 'black')
  .option('-e, --emoji <character>', 'Emoji character (required for emoji shape/mask)')
  .option('--fg-color <color>', 'Foreground color (named or hex, e.g. #ff8800)')
  .option('--bg-color <color>', 'Background color (named or hex)')
  .option('--scene <file>', 'Path to a JSON scene file (overrides shape/mask CLI options)')
  .parse(process.argv);

main();

const program = require('commander');
const { SHAPES } = require('./shapeGenerator');
const { MASKS, MASK_COLORS } = require('./maskGenerator');
const { validateOptions, generateImage } = require('./imageGenerator');
const { loadScene, renderSceneToFile, renderAnimation } = require('./sceneCompositor');

async function main()
{
    if ( program.scene )
    {
        try
        {
            console.log( `🎬 Loading scene: ${program.scene}` );
            const scene = loadScene( program.scene );
            if ( scene.animation && scene.animation.frames )
            {
                console.log( `🎞️  Rendering ${scene.animation.frames}-frame animation...` );
                const result = await renderAnimation( scene, 'output' );
                console.log( `✅ Wrote ${result.frameCount} frames to: ${result.frameDir}` );
                console.log( `✅ Filmstrip: ${result.filmstrip}` );
            }
            else
            {
                const outputFile = await renderSceneToFile( scene, 'output' );
                console.log( `✅ Generated: ${outputFile}` );
            }
        }
        catch ( err )
        {
            console.error( `❌ ${err.message || err}` );
            process.exitCode = 1;
        }
        return;
    }

    const options = {
        width: program.width,
        height: program.height,
        shape: program.shape,
        mask: program.mask,
        maskColor: program.maskColor,
        emoji: program.emoji
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
  .option('--scene <file>', 'Render a JSON scene file (multi-layer compositor)')
  .parse(process.argv);

main();

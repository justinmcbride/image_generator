const { createCanvas } = require( 'canvas' );

/**
 * Renders an emoji character to a 2D boolean grid.
 * true = emoji pixel (foreground), false = background.
 */
function renderEmojiGrid( emoji, width, height )
{
    if ( !emoji || typeof emoji !== 'string' )
    {
        throw new Error( 'Emoji character is required.' );
    }

    const canvas = createCanvas( width, height );
    const ctx = canvas.getContext( '2d' );

    ctx.clearRect( 0, 0, width, height );

    const fontSize = Math.floor( Math.min( width, height ) * 0.8 );
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const metrics = ctx.measureText( emoji );
    const textWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const x = ( width - textWidth ) / 2 + metrics.actualBoundingBoxLeft;
    const y = ( height - textHeight ) / 2 + metrics.actualBoundingBoxAscent;

    ctx.fillText( emoji, x, y );

    const imageData = ctx.getImageData( 0, 0, width, height );
    const pixels = imageData.data;
    const grid = [];

    for ( let y = 0; y < height; y++ )
    {
        const row = [];
        for ( let x = 0; x < width; x++ )
        {
            const alphaIndex = ( y * width + x ) * 4 + 3;
            row.push( pixels[ alphaIndex ] > 128 );
        }
        grid.push( row );
    }

    return grid;
}

module.exports = {
    renderEmojiGrid
};

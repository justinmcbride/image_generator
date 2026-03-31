const SHAPES = [ 'checkers', 'stripes', 'diamonds', 'circle', 'emoji' ];

function getShape( inputShape )
{
    if ( SHAPES.includes( inputShape ) ) return inputShape;
    if ( inputShape !== undefined && inputShape !== 'checkers' )
    {
        console.warn( `⚠️  Warning: unrecognized shape "${inputShape}", defaulting to "checkers". Available shapes: ${SHAPES.join( ', ' )}` );
    }
    return 'checkers';
}

function isForegroundPixel( w, h, gridWidth, gridHeight, shape, emojiGrid )
{
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;
    if ( shape === 'emoji' )
    {
        return emojiGrid && emojiGrid[ h ] && emojiGrid[ h ][ w ] === true;
    }
    if ( shape === 'checkers' )
    {
        return ( w + h ) % 2 === 1;
    }
    if ( shape === 'stripes' )
    {
        return w % 2 === 1;
    }
    if ( shape === 'diamonds' )
    {
        return ( Math.abs( w - centerX ) + Math.abs( h - centerY ) ) % 4 < 2;
    }
    if ( shape === 'circle' )
    {
        const radiusSquared = ( Math.min( gridWidth, gridHeight ) / 3 ) ** 2;
        return ( ( w - centerX ) ** 2 ) + ( ( h - centerY ) ** 2 ) < radiusSquared;
    }
    return false;
}

module.exports = {
    SHAPES,
    getShape,
    isForegroundPixel
};

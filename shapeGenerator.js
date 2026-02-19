const SHAPES = [ 'checkers', 'stripes', 'diamonds', 'circle' ];

function getShape( inputShape )
{
    return SHAPES.includes( inputShape ) ? inputShape : 'checkers';
}

function isForegroundPixel( w, h, gridWidth, gridHeight, shape )
{
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;
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

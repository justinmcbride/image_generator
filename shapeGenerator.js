const SHAPES = [ 'checkers', 'stripes', 'diamonds', 'circle' ];

function getShape( inputShape )
{
    return SHAPES.includes( inputShape ) ? inputShape : 'checkers';
}

function isForegroundPixel( w, h, gridWidth, gridHeight, shape )
{
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
        return ( Math.abs( w - ( gridWidth / 2 ) ) + Math.abs( h - ( gridHeight / 2 ) ) ) % 4 < 2;
    }
    if ( shape === 'circle' )
    {
        return ( ( w - ( gridWidth / 2 ) ) ** 2 ) + ( ( h - ( gridHeight / 2 ) ) ** 2 ) < ( Math.min( gridWidth, gridHeight ) / 3 ) ** 2;
    }
    return false;
}

module.exports = {
    SHAPES,
    getShape,
    isForegroundPixel
};

const MASKS = [ 'circle', 'diamond' ];
const MASK_COLORS = [ 'black', 'white', 'transparent' ];

function getMask( inputMask )
{
    return MASKS.includes( inputMask ) ? inputMask : null;
}

function getMaskColor( colorName )
{
    return MASK_COLORS.includes( colorName ) ? colorName : 'black';
}

function isInsideMask( x, y, imageWidth, imageHeight, mask )
{
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    if ( mask === 'circle' )
    {
        const radius = Math.min( imageWidth, imageHeight ) / 2;
        return ( ( x - centerX ) ** 2 + ( y - centerY ) ** 2 ) <= radius ** 2;
    }
    if ( mask === 'diamond' )
    {
        const halfSize = Math.min( imageWidth, imageHeight ) / 2;
        return ( Math.abs( x - centerX ) + Math.abs( y - centerY ) ) <= halfSize;
    }
    return true;
}

module.exports = {
    MASKS,
    MASK_COLORS,
    getMask,
    getMaskColor,
    isInsideMask
};

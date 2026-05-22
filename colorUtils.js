const jimp = require('jimp');

const NAMED_COLORS = {
    black: [ 0, 0, 0, 255 ],
    white: [ 255, 255, 255, 255 ],
    red: [ 255, 0, 0, 255 ],
    green: [ 0, 255, 0, 255 ],
    blue: [ 0, 0, 255, 255 ],
    yellow: [ 255, 255, 0, 255 ],
    cyan: [ 0, 255, 255, 255 ],
    magenta: [ 255, 0, 255, 255 ],
    gray: [ 128, 128, 128, 255 ],
    grey: [ 128, 128, 128, 255 ],
    transparent: [ 0, 0, 0, 0 ]
};

function parseColor( input )
{
    if ( input === undefined || input === null ) return null;
    if ( typeof input !== 'string' )
    {
        throw new Error( `Invalid color: ${input}` );
    }
    const lower = input.trim().toLowerCase();
    if ( NAMED_COLORS[ lower ] )
    {
        const [ r, g, b, a ] = NAMED_COLORS[ lower ];
        return { r, g, b, a };
    }
    const hexMatch = lower.match( /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/ );
    if ( !hexMatch )
    {
        throw new Error( `Invalid color "${input}". Use a named color or hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).` );
    }
    let hex = hexMatch[ 1 ];
    if ( hex.length === 3 || hex.length === 4 )
    {
        hex = hex.split( '' ).map( ( c ) => c + c ).join( '' );
    }
    const r = parseInt( hex.substring( 0, 2 ), 16 );
    const g = parseInt( hex.substring( 2, 4 ), 16 );
    const b = parseInt( hex.substring( 4, 6 ), 16 );
    const a = hex.length === 8 ? parseInt( hex.substring( 6, 8 ), 16 ) : 255;
    return { r, g, b, a };
}

function colorToInt( color )
{
    return jimp.rgbaToInt( color.r, color.g, color.b, color.a );
}

function intToColor( value )
{
    const rgba = jimp.intToRGBA( value );
    return { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a };
}

module.exports = {
    NAMED_COLORS,
    parseColor,
    colorToInt,
    intToColor
};

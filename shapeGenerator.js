const SHAPES = [ 'checkers', 'stripes', 'diamonds', 'circle', 'emoji', 'gradient', 'noise', 'grid', 'solid' ];

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
    if ( shape === 'solid' )
    {
        return true;
    }
    return false;
}

// Mulberry32 PRNG for reproducible noise
function makeRng( seed )
{
    let t = ( seed >>> 0 ) || 1;
    return function ()
    {
        t = ( t + 0x6D2B79F5 ) >>> 0;
        let r = t;
        r = Math.imul( r ^ ( r >>> 15 ), r | 1 );
        r ^= r + Math.imul( r ^ ( r >>> 7 ), r | 61 );
        return ( ( r ^ ( r >>> 14 ) ) >>> 0 ) / 4294967296;
    };
}

function hashNoise( x, y, seed )
{
    // Cheap deterministic hash → [0, 1)
    let h = ( x * 374761393 ) ^ ( y * 668265263 ) ^ ( seed * 1274126177 );
    h = ( h ^ ( h >>> 13 ) ) >>> 0;
    h = Math.imul( h, 1274126177 ) >>> 0;
    return ( ( h ^ ( h >>> 16 ) ) >>> 0 ) / 4294967296;
}

function lerpColor( a, b, t )
{
    return {
        r: Math.round( a.r + ( b.r - a.r ) * t ),
        g: Math.round( a.g + ( b.g - a.g ) * t ),
        b: Math.round( a.b + ( b.b - a.b ) * t ),
        a: Math.round( a.a + ( b.a - a.a ) * t )
    };
}

/**
 * Returns the color { r, g, b, a } for pattern at (x, y), or null for "background"
 * (transparent at the layer level — caller decides if it gets filled with bg).
 *
 * patternOptions can include:
 *   - angle (gradient, degrees)
 *   - seed (noise)
 *   - spacing, thickness (grid)
 */
function getPatternPixel( x, y, width, height, shape, fg, bg, emojiGrid, patternOptions )
{
    const opts = patternOptions || {};
    if ( shape === 'gradient' )
    {
        const angleRad = ( ( opts.angle !== undefined ? opts.angle : 0 ) * Math.PI ) / 180;
        const dx = Math.cos( angleRad );
        const dy = Math.sin( angleRad );
        // Project (x, y) onto the gradient direction, normalize to [0, 1]
        const minProj = Math.min( 0, ( width - 1 ) * dx ) + Math.min( 0, ( height - 1 ) * dy );
        const maxProj = Math.max( 0, ( width - 1 ) * dx ) + Math.max( 0, ( height - 1 ) * dy );
        const proj = x * dx + y * dy;
        const t = maxProj === minProj ? 0 : ( proj - minProj ) / ( maxProj - minProj );
        return lerpColor( bg, fg, Math.max( 0, Math.min( 1, t ) ) );
    }
    if ( shape === 'noise' )
    {
        const seed = opts.seed !== undefined ? opts.seed : 1;
        const v = hashNoise( x, y, seed );
        if ( opts.threshold !== undefined )
        {
            return v < opts.threshold ? bg : fg;
        }
        return lerpColor( bg, fg, v );
    }
    if ( shape === 'grid' )
    {
        const spacing = Math.max( 1, opts.spacing || 8 );
        const thickness = Math.max( 1, opts.thickness || 1 );
        const onLine = ( x % spacing ) < thickness || ( y % spacing ) < thickness;
        return onLine ? fg : bg;
    }
    // Binary shapes use isForegroundPixel and pick fg/bg
    return isForegroundPixel( x, y, width, height, shape, emojiGrid ) ? fg : bg;
}

module.exports = {
    SHAPES,
    getShape,
    isForegroundPixel,
    getPatternPixel,
    makeRng,
    lerpColor
};


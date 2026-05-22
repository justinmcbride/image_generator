const BLEND_MODES = [ 'normal', 'multiply', 'screen', 'additive', 'overlay' ];

function clamp( v, lo, hi ) { return v < lo ? lo : v > hi ? hi : v; }
function clamp255( v ) { return clamp( Math.round( v ), 0, 255 ); }

function blendChannel( base, top, mode )
{
    const b = base / 255;
    const t = top / 255;
    let out;
    switch ( mode )
    {
        case 'multiply':
            out = b * t; break;
        case 'screen':
            out = 1 - ( 1 - b ) * ( 1 - t ); break;
        case 'additive':
            out = b + t; break;
        case 'overlay':
            out = b < 0.5 ? 2 * b * t : 1 - 2 * ( 1 - b ) * ( 1 - t );
            break;
        case 'normal':
        default:
            out = t;
    }
    return clamp255( out * 255 );
}

/**
 * Composite a top RGBA pixel over a base RGBA pixel.
 * - mode applies per-channel blending of color
 * - layer-level opacity is multiplied into top.a before alpha compositing
 */
function composite( base, top, mode, opacity )
{
    const op = clamp( opacity === undefined ? 1 : opacity, 0, 1 );
    const topAlpha = ( top.a / 255 ) * op;
    if ( topAlpha <= 0 ) return { ...base };

    const blendedR = blendChannel( base.r, top.r, mode );
    const blendedG = blendChannel( base.g, top.g, mode );
    const blendedB = blendChannel( base.b, top.b, mode );

    const baseAlpha = base.a / 255;
    const outAlpha = topAlpha + baseAlpha * ( 1 - topAlpha );
    if ( outAlpha <= 0 )
    {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    const mix = ( bChan, blended ) =>
        ( blended * topAlpha + bChan * baseAlpha * ( 1 - topAlpha ) ) / outAlpha;
    return {
        r: clamp255( mix( base.r, blendedR ) ),
        g: clamp255( mix( base.g, blendedG ) ),
        b: clamp255( mix( base.b, blendedB ) ),
        a: clamp255( outAlpha * 255 )
    };
}

module.exports = {
    BLEND_MODES,
    composite,
    blendChannel
};

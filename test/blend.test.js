const test = require('node:test');
const assert = require('node:assert/strict');
const { composite, blendChannel, BLEND_MODES } = require('../blend');

test( 'BLEND_MODES enumerates supported modes', () =>
{
    assert.deepEqual( BLEND_MODES, [ 'normal', 'multiply', 'screen', 'additive', 'overlay' ] );
} );

test( 'blendChannel multiply: white * x = x', () =>
{
    assert.equal( blendChannel( 255, 128, 'multiply' ), 128 );
} );

test( 'blendChannel screen: black screen x = x', () =>
{
    assert.equal( blendChannel( 0, 200, 'screen' ), 200 );
} );

test( 'blendChannel additive clamps at 255', () =>
{
    assert.equal( blendChannel( 200, 200, 'additive' ), 255 );
} );

test( 'composite normal at full opacity yields top color', () =>
{
    const base = { r: 0, g: 0, b: 0, a: 255 };
    const top = { r: 100, g: 150, b: 200, a: 255 };
    assert.deepEqual( composite( base, top, 'normal', 1 ), top );
} );

test( 'composite at opacity 0 returns base unchanged', () =>
{
    const base = { r: 10, g: 20, b: 30, a: 255 };
    const top = { r: 200, g: 200, b: 200, a: 255 };
    assert.deepEqual( composite( base, top, 'normal', 0 ), base );
} );

test( 'composite with transparent top returns base', () =>
{
    const base = { r: 10, g: 20, b: 30, a: 255 };
    const top = { r: 200, g: 200, b: 200, a: 0 };
    assert.deepEqual( composite( base, top, 'multiply', 1 ), base );
} );

test( 'composite halfway blends colors', () =>
{
    const base = { r: 0, g: 0, b: 0, a: 255 };
    const top = { r: 200, g: 200, b: 200, a: 255 };
    const out = composite( base, top, 'normal', 0.5 );
    // top alpha after opacity = 0.5; base alpha 1; outAlpha = 0.5 + 1*0.5 = 1
    // mix = (200*0.5 + 0*1*0.5)/1 = 100
    assert.deepEqual( out, { r: 100, g: 100, b: 100, a: 255 } );
} );

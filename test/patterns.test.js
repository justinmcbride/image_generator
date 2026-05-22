const test = require('node:test');
const assert = require('node:assert/strict');
const { getPatternPixel, SHAPES } = require('../shapeGenerator');

const FG = { r: 255, g: 255, b: 255, a: 255 };
const BG = { r: 0, g: 0, b: 0, a: 255 };

test( 'SHAPES includes new patterns', () =>
{
    for ( const s of [ 'gradient', 'noise', 'grid', 'solid' ] )
    {
        assert.ok( SHAPES.includes( s ), `${s} should be in SHAPES` );
    }
} );

test( 'solid pattern fills with foreground everywhere', () =>
{
    for ( let y = 0; y < 8; y++ ) for ( let x = 0; x < 8; x++ )
    {
        assert.deepEqual( getPatternPixel( x, y, 8, 8, 'solid', FG, BG ), FG );
    }
} );

test( 'gradient at angle 0 interpolates left→right', () =>
{
    const left = getPatternPixel( 0, 0, 8, 8, 'gradient', FG, BG, null, { angle: 0 } );
    const right = getPatternPixel( 7, 0, 8, 8, 'gradient', FG, BG, null, { angle: 0 } );
    assert.deepEqual( left, BG );
    assert.deepEqual( right, FG );
} );

test( 'gradient color channels stay in [0, 255]', () =>
{
    for ( let x = 0; x < 16; x++ )
    {
        const p = getPatternPixel( x, 0, 16, 16, 'gradient', FG, BG, null, { angle: 30 } );
        for ( const c of [ 'r', 'g', 'b', 'a' ] )
        {
            assert.ok( p[ c ] >= 0 && p[ c ] <= 255, `channel ${c} out of range: ${p[ c ]}` );
        }
    }
} );

test( 'noise is deterministic for a given seed', () =>
{
    const a = getPatternPixel( 3, 4, 8, 8, 'noise', FG, BG, null, { seed: 42 } );
    const b = getPatternPixel( 3, 4, 8, 8, 'noise', FG, BG, null, { seed: 42 } );
    assert.deepEqual( a, b );
} );

test( 'noise channels stay in [0, 255]', () =>
{
    for ( let y = 0; y < 16; y++ ) for ( let x = 0; x < 16; x++ )
    {
        const p = getPatternPixel( x, y, 16, 16, 'noise', FG, BG, null, { seed: 1 } );
        for ( const c of [ 'r', 'g', 'b', 'a' ] )
        {
            assert.ok( p[ c ] >= 0 && p[ c ] <= 255, `noise out of range at ${x},${y}` );
        }
    }
} );

test( 'noise with threshold returns either fg or bg', () =>
{
    for ( let y = 0; y < 8; y++ ) for ( let x = 0; x < 8; x++ )
    {
        const p = getPatternPixel( x, y, 8, 8, 'noise', FG, BG, null, { seed: 9, threshold: 0.5 } );
        assert.ok( p === FG || p === BG );
    }
} );

test( 'grid draws lines at spacing', () =>
{
    // spacing 4, thickness 1 → lines at x%4==0 or y%4==0
    const onLine = getPatternPixel( 0, 5, 16, 16, 'grid', FG, BG, null, { spacing: 4, thickness: 1 } );
    const offLine = getPatternPixel( 2, 5, 16, 16, 'grid', FG, BG, null, { spacing: 4, thickness: 1 } );
    assert.deepEqual( onLine, FG );
    assert.deepEqual( offLine, BG );
} );

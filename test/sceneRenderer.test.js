const test = require('node:test');
const assert = require('node:assert/strict');
const { validateScene, sampleSourceCoord, renderScene } = require('../sceneRenderer');
const { intToColor } = require('../colorUtils');

test( 'validateScene flags missing layers', () =>
{
    const errs = validateScene( { width: 8, height: 8 } );
    assert.ok( errs.some( ( e ) => e.includes( 'layers' ) ) );
} );

test( 'validateScene flags invalid blend and opacity', () =>
{
    const errs = validateScene( {
        width: 8, height: 8,
        layers: [ { shape: 'solid', blend: 'bogus', opacity: 2 } ]
    } );
    assert.ok( errs.some( ( e ) => /blend/.test( e ) ) );
    assert.ok( errs.some( ( e ) => /opacity/.test( e ) ) );
} );

test( 'validateScene flags invalid fgColor', () =>
{
    const errs = validateScene( {
        width: 8, height: 8,
        layers: [ { shape: 'solid', fgColor: '#zzz' } ]
    } );
    assert.ok( errs.some( ( e ) => /fgColor/.test( e ) ) );
} );

test( 'validateScene accepts a valid scene', () =>
{
    const errs = validateScene( {
        width: 4, height: 4,
        layers: [ { shape: 'checkers', fgColor: 'white', bgColor: 'black' } ]
    } );
    assert.deepEqual( errs, [] );
} );

test( 'sampleSourceCoord identity when no transform', () =>
{
    assert.deepEqual( sampleSourceCoord( 3, 5, 10, 10, null ), { sx: 3, sy: 5 } );
} );

test( 'sampleSourceCoord applies inverse offset', () =>
{
    // Forward translates src+offset → out. Inverse: out-offset = src.
    assert.deepEqual( sampleSourceCoord( 7, 7, 10, 10, { offset: [ 2, 3 ] } ), { sx: 5, sy: 4 } );
} );

test( 'sampleSourceCoord returns null for zero scale', () =>
{
    assert.equal( sampleSourceCoord( 1, 1, 10, 10, { scale: 0 } ), null );
} );

test( 'renderScene produces an image with the expected dimensions', async () =>
{
    const image = await renderScene( {
        width: 8, height: 8,
        background: '#000000',
        layers: [
            { shape: 'solid', fgColor: '#ff0000', bgColor: 'transparent', blend: 'normal' }
        ]
    } );
    assert.equal( image.bitmap.width, 8 );
    assert.equal( image.bitmap.height, 8 );
    const center = intToColor( image.getPixelColor( 4, 4 ) );
    assert.equal( center.r, 255 );
    assert.equal( center.g, 0 );
    assert.equal( center.b, 0 );
} );

test( 'renderScene composites two layers with blend', async () =>
{
    const image = await renderScene( {
        width: 4, height: 4,
        background: '#000000',
        layers: [
            { shape: 'solid', fgColor: '#808080', bgColor: 'transparent', blend: 'normal', opacity: 1 },
            { shape: 'solid', fgColor: '#808080', bgColor: 'transparent', blend: 'additive', opacity: 1 }
        ]
    } );
    const c = intToColor( image.getPixelColor( 0, 0 ) );
    // 128 + 128 clamped → 255
    assert.equal( c.r, 255 );
} );

test( 'renderScene throws on invalid scene', async () =>
{
    await assert.rejects(
        renderScene( { width: 0, height: 8, layers: [] } ),
        /Scene/
    );
} );

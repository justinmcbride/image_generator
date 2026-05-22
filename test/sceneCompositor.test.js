const test = require( 'node:test' );
const assert = require( 'node:assert/strict' );
const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const {
    parseColor,
    compositePixel,
    blendChannel,
    buildSampler,
    validateScene,
    loadScene,
    renderLayer,
    compositeScene,
    renderSceneToFile
} = require( '../sceneCompositor' );

test( 'parseColor handles named colors', () =>
{
    assert.deepEqual( parseColor( 'red' ), { r: 255, g: 0, b: 0, a: 255 } );
    assert.deepEqual( parseColor( 'transparent' ), { r: 0, g: 0, b: 0, a: 0 } );
    assert.deepEqual( parseColor( 'WHITE' ), { r: 255, g: 255, b: 255, a: 255 } );
} );

test( 'parseColor handles hex variants', () =>
{
    assert.deepEqual( parseColor( '#f00' ), { r: 255, g: 0, b: 0, a: 255 } );
    assert.deepEqual( parseColor( '#f008' ), { r: 255, g: 0, b: 0, a: 136 } );
    assert.deepEqual( parseColor( '#00ff00' ), { r: 0, g: 255, b: 0, a: 255 } );
    assert.deepEqual( parseColor( '#0000ff80' ), { r: 0, g: 0, b: 255, a: 128 } );
} );

test( 'parseColor rejects garbage input', () =>
{
    assert.throws( () => parseColor( 'not-a-color' ) );
    assert.throws( () => parseColor( '#xyz' ) );
    assert.throws( () => parseColor( 42 ) );
} );

test( 'compositePixel: opaque top fully overwrites base', () =>
{
    const out = compositePixel(
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 128, b: 64, a: 255 }
    );
    assert.deepEqual( out, { r: 255, g: 128, b: 64, a: 255 } );
} );

test( 'compositePixel: transparent top leaves base unchanged', () =>
{
    const out = compositePixel(
        { r: 10, g: 20, b: 30, a: 255 },
        { r: 255, g: 255, b: 255, a: 0 }
    );
    assert.deepEqual( out, { r: 10, g: 20, b: 30, a: 255 } );
} );

test( 'compositePixel: half-alpha mid blend', () =>
{
    const out = compositePixel(
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 200, g: 200, b: 200, a: 128 }
    );
    // about half-way between 0 and 200
    assert.ok( out.r >= 95 && out.r <= 105, `r=${out.r}` );
    assert.equal( out.a, 255 );
} );

test( 'validateScene catches missing/invalid fields', () =>
{
    assert.ok( validateScene( null ).length > 0 );
    const errs = validateScene( { width: -1, height: 0, layers: [] } );
    assert.ok( errs.some( ( e ) => /width/i.test( e ) ) );
    assert.ok( errs.some( ( e ) => /height/i.test( e ) ) );
    assert.ok( errs.some( ( e ) => /layers/i.test( e ) ) );
} );

test( 'validateScene catches bad layer shape and color', () =>
{
    const errs = validateScene( {
        width: 16, height: 16,
        layers: [ { shape: 'bogus', foreground: '#zzz' } ]
    } );
    assert.ok( errs.some( ( e ) => /shape/.test( e ) ) );
    assert.ok( errs.some( ( e ) => /foreground/.test( e ) ) );
} );

test( 'validateScene accepts a valid minimal scene', () =>
{
    const errs = validateScene( {
        width: 4, height: 4,
        layers: [ { shape: 'checkers' } ]
    } );
    assert.deepEqual( errs, [] );
} );

test( 'renderLayer produces fg/bg pixels per shape', () =>
{
    const px = renderLayer(
        { shape: 'checkers', foreground: 'red', background: 'transparent' },
        2, 2
    );
    // (0,0) bg, (1,0) fg, (0,1) fg, (1,1) bg  per checkers rule (x+y) odd = fg
    assert.equal( px[ 0 * 4 + 3 ], 0 );   // bg alpha 0
    assert.equal( px[ 1 * 4 + 0 ], 255 ); // fg red
    assert.equal( px[ 1 * 4 + 3 ], 255 );
} );

test( 'renderLayer applies opacity', () =>
{
    const px = renderLayer(
        { shape: 'stripes', foreground: 'red', background: 'black', opacity: 0.5 },
        2, 2
    );
    // every pixel alpha should be ~128
    for ( let i = 3; i < px.length; i += 4 )
    {
        assert.ok( px[ i ] >= 126 && px[ i ] <= 130, `alpha=${px[i]}` );
    }
} );

test( 'compositeScene stacks layers top-down with alpha', () =>
{
    const scene = {
        width: 2, height: 2,
        background: 'black',
        layers: [
            { shape: 'stripes', foreground: 'red',   background: 'transparent' },
            { shape: 'stripes', foreground: 'green', background: 'transparent', opacity: 1.0 }
        ]
    };
    const px = compositeScene( scene );
    // x=1 column has both fg; top layer (green) wins fully (opacity 1, opaque)
    const idx = ( 0 * 2 + 1 ) * 4;
    assert.deepEqual(
        [ px[ idx ], px[ idx + 1 ], px[ idx + 2 ], px[ idx + 3 ] ],
        [ 0, 255, 0, 255 ]
    );
    // x=0 column: no fg in either layer => background black shows through
    const idx0 = 0;
    assert.deepEqual(
        [ px[ idx0 ], px[ idx0 + 1 ], px[ idx0 + 2 ], px[ idx0 + 3 ] ],
        [ 0, 0, 0, 255 ]
    );
} );

test( 'compositeScene skips invisible layers', () =>
{
    const scene = {
        width: 2, height: 2,
        background: 'black',
        layers: [
            { shape: 'stripes', foreground: 'red', background: 'transparent', visible: false }
        ]
    };
    const px = compositeScene( scene );
    for ( let i = 0; i < px.length; i += 4 )
    {
        assert.deepEqual(
            [ px[ i ], px[ i + 1 ], px[ i + 2 ], px[ i + 3 ] ],
            [ 0, 0, 0, 255 ]
        );
    }
} );

test( 'loadScene reads and parses a JSON file', () =>
{
    const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'scene-' ) );
    const file = path.join( tmpDir, 'scene.json' );
    fs.writeFileSync( file, JSON.stringify( {
        width: 4, height: 4,
        layers: [ { shape: 'checkers' } ]
    } ) );
    const scene = loadScene( file );
    assert.equal( scene.width, 4 );
    assert.equal( scene.layers.length, 1 );
} );

test( 'loadScene throws on malformed JSON', () =>
{
    const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'scene-' ) );
    const file = path.join( tmpDir, 'bad.json' );
    fs.writeFileSync( file, '{ not valid json' );
    assert.throws( () => loadScene( file ), /Failed to parse/ );
} );

test( 'renderSceneToFile writes a PNG to disk', async () =>
{
    const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'scene-out-' ) );
    const scene = {
        name: 'unit_test',
        width: 8, height: 8,
        background: 'black',
        layers: [ { shape: 'circle', foreground: 'green' } ]
    };
    const file = await renderSceneToFile( scene, tmpDir );
    assert.ok( fs.existsSync( file ) );
    assert.ok( fs.statSync( file ).size > 0 );
} );

// ───── Iteration 2: transforms and blend modes ─────

test( 'blendChannel implements each mode', () =>
{
    assert.equal( blendChannel( 100, 200, 'normal' ), 200 );
    assert.equal( blendChannel( 100, 200, 'multiply' ), Math.round( 100 * 200 / 255 ) );
    assert.equal( blendChannel( 100, 200, 'screen' ), Math.round( 255 - ( 155 * 55 ) / 255 ) );
    assert.equal( blendChannel( 100, 200, 'add' ), 255 );
    assert.equal( blendChannel( 200, 50, 'add' ), 250 );
    assert.equal( blendChannel( 100, 200, 'darken' ), 100 );
    assert.equal( blendChannel( 100, 200, 'lighten' ), 200 );
    // unknown mode falls back to normal
    assert.equal( blendChannel( 100, 200, 'no-such-mode' ), 200 );
} );

test( 'buildSampler returns identity for no transform', () =>
{
    const s = buildSampler( undefined, 10, 10 );
    assert.deepEqual( s( 3, 4 ), { x: 3, y: 4 } );
} );

test( 'buildSampler offset shifts coordinates', () =>
{
    // offset = +2 means the layer content moves +2 to the right
    // (inverse sampling subtracts +2 → fetch x-2 from source).
    const s = buildSampler( { offsetX: 2, offsetY: 0 }, 10, 10 );
    const r = s( 5, 5 );
    assert.equal( Math.round( r.x ), 3 );
    assert.equal( Math.round( r.y ), 5 );
} );

test( 'buildSampler scale magnifies content', () =>
{
    // 2x scale ⇒ sampling halves the distance from center
    const s = buildSampler( { scale: 2 }, 10, 10 );
    const r = s( 9, 5 );
    // center x=5, dx=4 → source dx=2 → sx=7
    assert.equal( Math.round( r.x ), 7 );
    assert.equal( Math.round( r.y ), 5 );
} );

test( 'buildSampler rotate 90deg swaps axes', () =>
{
    const s = buildSampler( { rotate: 90 }, 11, 11 );
    // With 90° clockwise content rotation, the point originally at top-middle (5,1)
    // ends up rendered at output (10,5). Inverse sampling: sample(10,5) → (5,1).
    const r = s( 10, 5 );
    assert.equal( Math.round( r.x ), 5 );
    assert.equal( Math.round( r.y ), 1 );
} );

test( 'renderLayer respects offset transform', () =>
{
    // stripes: source fg where x is odd. With offsetX=1, output fg where (x-1) is odd ⇒ x even.
    const px = renderLayer(
        { shape: 'stripes', foreground: 'white', background: 'black', transform: { offsetX: 1 } },
        4, 1
    );
    // x=0 → sx=-1 (out of bounds, bg=black) ; x=1 → sx=0 even, bg=black ; x=2 → sx=1 odd, fg=white
    const pixelAt = ( x ) => ( { r: px[ x * 4 ], g: px[ x * 4 + 1 ], b: px[ x * 4 + 2 ] } );
    assert.deepEqual( pixelAt( 0 ), { r: 0, g: 0, b: 0 } );   // out-of-bounds bg
    assert.deepEqual( pixelAt( 2 ), { r: 255, g: 255, b: 255 } ); // shifted fg
} );

test( 'validateLayer rejects bad blendMode and transform', () =>
{
    const errs = validateScene( {
        width: 4, height: 4,
        layers: [ {
            shape: 'checkers',
            blendMode: 'crazyMode',
            transform: { scale: 0, rotate: 'spin' }
        } ]
    } );
    assert.ok( errs.some( ( e ) => /blendMode/.test( e ) ) );
    assert.ok( errs.some( ( e ) => /scale cannot be zero/.test( e ) ) );
    assert.ok( errs.some( ( e ) => /rotate/.test( e ) ) );
} );

test( 'compositeScene applies multiply blend mode', () =>
{
    const scene = {
        width: 1, height: 1,
        background: 'transparent',
        layers: [
            { shape: 'checkers', foreground: { r: 200, g: 200, b: 200, a: 255 },
              background: { r: 200, g: 200, b: 200, a: 255 } },
            { shape: 'checkers', foreground: { r: 128, g: 128, b: 128, a: 255 },
              background: { r: 128, g: 128, b: 128, a: 255 }, blendMode: 'multiply' }
        ]
    };
    const px = compositeScene( scene );
    const expected = Math.round( 200 * 128 / 255 );
    assert.equal( px[ 0 ], expected );
    assert.equal( px[ 1 ], expected );
    assert.equal( px[ 2 ], expected );
    assert.equal( px[ 3 ], 255 );
} );

test( 'compositeScene applies darken and lighten', () =>
{
    const base = { shape: 'checkers', foreground: { r: 100, g: 200, b: 50, a: 255 },
                   background: { r: 100, g: 200, b: 50, a: 255 } };
    const top  = { shape: 'checkers', foreground: { r: 200, g: 100, b: 50, a: 255 },
                   background: { r: 200, g: 100, b: 50, a: 255 } };
    const darkPx = compositeScene( { width: 1, height: 1, background: 'transparent',
        layers: [ base, { ...top, blendMode: 'darken' } ] } );
    assert.deepEqual( [ darkPx[0], darkPx[1], darkPx[2] ], [ 100, 100, 50 ] );

    const lightPx = compositeScene( { width: 1, height: 1, background: 'transparent',
        layers: [ base, { ...top, blendMode: 'lighten' } ] } );
    assert.deepEqual( [ lightPx[0], lightPx[1], lightPx[2] ], [ 200, 200, 50 ] );
} );

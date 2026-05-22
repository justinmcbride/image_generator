const test = require('node:test');
const assert = require('node:assert/strict');
const { parseColor, colorToInt } = require('../colorUtils');

test( 'parseColor named colors', () =>
{
    assert.deepEqual( parseColor( 'red' ), { r: 255, g: 0, b: 0, a: 255 } );
    assert.deepEqual( parseColor( 'TRANSPARENT' ), { r: 0, g: 0, b: 0, a: 0 } );
    assert.deepEqual( parseColor( ' Grey ' ), { r: 128, g: 128, b: 128, a: 255 } );
} );

test( 'parseColor hex variants', () =>
{
    assert.deepEqual( parseColor( '#f00' ), { r: 255, g: 0, b: 0, a: 255 } );
    assert.deepEqual( parseColor( '#f008' ), { r: 255, g: 0, b: 0, a: 0x88 } );
    assert.deepEqual( parseColor( '#ff8800' ), { r: 255, g: 136, b: 0, a: 255 } );
    assert.deepEqual( parseColor( '#ff880080' ), { r: 255, g: 136, b: 0, a: 0x80 } );
    assert.deepEqual( parseColor( 'ff8800' ), { r: 255, g: 136, b: 0, a: 255 } );
} );

test( 'parseColor returns null for nullish input', () =>
{
    assert.equal( parseColor( null ), null );
    assert.equal( parseColor( undefined ), null );
} );

test( 'parseColor throws for invalid input', () =>
{
    assert.throws( () => parseColor( '#zzz' ), /Invalid color/ );
    assert.throws( () => parseColor( 'not-a-color' ), /Invalid color/ );
    assert.throws( () => parseColor( 42 ), /Invalid color/ );
} );

test( 'colorToInt round-trips through jimp', () =>
{
    const c = parseColor( '#11223344' );
    const v = colorToInt( c );
    assert.equal( typeof v, 'number' );
} );

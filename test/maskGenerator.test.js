const test = require('node:test');
const assert = require('node:assert/strict');
const { getMask, getMaskColor, isInsideMask } = require('../maskGenerator');

function renderMask( width, height, mask )
{
    const rows = [];
    for ( let h = 0; h < height; h++ )
    {
        let row = '';
        for ( let w = 0; w < width; w++ )
        {
            row += isInsideMask( w, h, width, height, mask ) ? '1' : '0';
        }
        rows.push( row );
    }
    return rows;
}

test( 'getMask returns valid mask names and null for invalid', () =>
{
    assert.equal( getMask( 'circle' ), 'circle' );
    assert.equal( getMask( 'diamond' ), 'diamond' );
    assert.equal( getMask( 'invalid' ), null );
    assert.equal( getMask( undefined ), null );
} );

test( 'getMaskColor returns valid color names and defaults to black', () =>
{
    assert.equal( getMaskColor( 'black' ), 'black' );
    assert.equal( getMaskColor( 'white' ), 'white' );
    assert.equal( getMaskColor( 'transparent' ), 'transparent' );
    assert.equal( getMaskColor( 'invalid' ), 'black' );
    assert.equal( getMaskColor( undefined ), 'black' );
} );

test( 'circle mask for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderMask( 4, 4, 'circle' ), [
        '0010',
        '0111',
        '1111',
        '0111'
    ] );

    assert.deepEqual( renderMask( 5, 5, 'circle' ), [
        '00000',
        '01111',
        '01111',
        '01111',
        '01111'
    ] );
} );

test( 'diamond mask for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderMask( 4, 4, 'diamond' ), [
        '0010',
        '0111',
        '1111',
        '0111'
    ] );

    assert.deepEqual( renderMask( 5, 5, 'diamond' ), [
        '00000',
        '00110',
        '01111',
        '01111',
        '00110'
    ] );
} );

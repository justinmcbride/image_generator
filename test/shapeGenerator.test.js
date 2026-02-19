const test = require('node:test');
const assert = require('node:assert/strict');
const { getShape, isForegroundPixel } = require('../shapeGenerator');

function renderGrid( width, height, shape )
{
    const rows = [];
    for ( let h = 0; h < height; h++ )
    {
        let row = '';
        for ( let w = 0; w < width; w++ )
        {
            row += isForegroundPixel( w, h, width, height, shape ) ? '1' : '0';
        }
        rows.push( row );
    }
    return rows;
}

test( 'getShape defaults invalid values to checkers', () =>
{
    assert.equal( getShape( 'invalid-shape' ), 'checkers' );
} );

test( 'checkers pattern for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderGrid( 4, 4, 'checkers' ), [
        '0101',
        '1010',
        '0101',
        '1010'
    ] );

    assert.deepEqual( renderGrid( 5, 5, 'checkers' ), [
        '01010',
        '10101',
        '01010',
        '10101',
        '01010'
    ] );
} );

test( 'stripes pattern for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderGrid( 4, 4, 'stripes' ), [
        '0101',
        '0101',
        '0101',
        '0101'
    ] );

    assert.deepEqual( renderGrid( 5, 5, 'stripes' ), [
        '01010',
        '01010',
        '01010',
        '01010',
        '01010'
    ] );
} );

test( 'diamonds pattern for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderGrid( 4, 4, 'diamonds' ), [
        '1000',
        '0010',
        '0111',
        '0010'
    ] );

    assert.deepEqual( renderGrid( 5, 5, 'diamonds' ), [
        '11001',
        '10000',
        '00110',
        '00110',
        '10000'
    ] );
} );

test( 'circle pattern for 4x4 and 5x5', () =>
{
    assert.deepEqual( renderGrid( 4, 4, 'circle' ), [
        '0000',
        '0010',
        '0111',
        '0010'
    ] );

    assert.deepEqual( renderGrid( 5, 5, 'circle' ), [
        '00000',
        '00110',
        '01111',
        '01111',
        '00110'
    ] );
} );

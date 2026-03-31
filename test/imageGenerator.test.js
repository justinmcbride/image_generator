const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { validateOptions, generateImage } = require('../imageGenerator');

test( 'validateOptions rejects missing width', () =>
{
    const errors = validateOptions( { height: 64 } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /Width/ );
} );

test( 'validateOptions rejects missing height', () =>
{
    const errors = validateOptions( { width: 64 } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /Height/ );
} );

test( 'validateOptions rejects both missing', () =>
{
    const errors = validateOptions( {} );
    assert.equal( errors.length, 2 );
} );

test( 'validateOptions rejects negative dimensions', () =>
{
    const errors = validateOptions( { width: -5, height: 0 } );
    assert.equal( errors.length, 2 );
    assert.match( errors[0], /positive integer/ );
    assert.match( errors[1], /positive integer/ );
} );

test( 'validateOptions rejects non-integer dimensions', () =>
{
    const errors = validateOptions( { width: 3.5, height: 64 } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /positive integer/ );
} );

test( 'validateOptions rejects NaN dimensions', () =>
{
    const errors = validateOptions( { width: NaN, height: 64 } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /required/ );
} );

test( 'validateOptions accepts valid dimensions', () =>
{
    const errors = validateOptions( { width: 64, height: 128 } );
    assert.equal( errors.length, 0 );
} );

test( 'generateImage creates a checkers PNG file', async () =>
{
    const outputFile = await generateImage( { width: 16, height: 16, shape: 'checkers' } );
    assert.ok( fs.existsSync( outputFile ), `Expected file to exist: ${outputFile}` );
    const stats = fs.statSync( outputFile );
    assert.ok( stats.size > 0, 'File should not be empty' );
    fs.unlinkSync( outputFile );
} );

test( 'generateImage creates images for all shapes', async () =>
{
    const shapes = [ 'checkers', 'stripes', 'diamonds', 'circle' ];
    for ( const shape of shapes )
    {
        const outputFile = await generateImage( { width: 16, height: 16, shape } );
        assert.ok( fs.existsSync( outputFile ), `Expected ${shape} file: ${outputFile}` );
        assert.ok( outputFile.includes( shape ), `Filename should contain shape: ${shape}` );
        fs.unlinkSync( outputFile );
    }
} );

test( 'generateImage creates a masked image', async () =>
{
    const outputFile = await generateImage( {
        width: 16,
        height: 16,
        shape: 'checkers',
        mask: 'circle',
        maskColor: 'black'
    } );
    assert.ok( fs.existsSync( outputFile ), `Expected masked file: ${outputFile}` );
    assert.ok( outputFile.includes( '_circle_black' ), 'Filename should contain mask info' );
    fs.unlinkSync( outputFile );
} );

test( 'generateImage output filename format is correct', async () =>
{
    const outputFile = await generateImage( { width: 32, height: 64, shape: 'stripes' } );
    assert.equal( outputFile, 'output/stripes_1px_32x64.png' );
    fs.unlinkSync( outputFile );
} );

test( 'generateImage masked output filename format is correct', async () =>
{
    const outputFile = await generateImage( {
        width: 32,
        height: 64,
        shape: 'diamonds',
        mask: 'diamond',
        maskColor: 'transparent'
    } );
    assert.equal( outputFile, 'output/diamonds_1px_32x64_diamond_transparent.png' );
    fs.unlinkSync( outputFile );
} );

test( 'validateOptions requires --emoji when shape is emoji', () =>
{
    const errors = validateOptions( { width: 64, height: 64, shape: 'emoji' } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /--emoji/ );
} );

test( 'validateOptions requires --emoji when mask is emoji', () =>
{
    const errors = validateOptions( { width: 64, height: 64, mask: 'emoji' } );
    assert.equal( errors.length, 1 );
    assert.match( errors[0], /--emoji/ );
} );

test( 'validateOptions accepts emoji with --emoji provided', () =>
{
    const errors = validateOptions( { width: 64, height: 64, shape: 'emoji', emoji: '🐐' } );
    assert.equal( errors.length, 0 );
} );

test( 'generateImage creates an emoji shape image', async () =>
{
    const outputFile = await generateImage( { width: 64, height: 64, shape: 'emoji', emoji: '⭐' } );
    assert.ok( fs.existsSync( outputFile ), `Expected emoji file: ${outputFile}` );
    assert.ok( outputFile.includes( 'emoji_⭐' ), 'Filename should contain emoji' );
    fs.unlinkSync( outputFile );
} );

test( 'generateImage creates an emoji mask image', async () =>
{
    const outputFile = await generateImage( {
        width: 64,
        height: 64,
        shape: 'checkers',
        mask: 'emoji',
        emoji: '🐐',
        maskColor: 'white'
    } );
    assert.ok( fs.existsSync( outputFile ), `Expected emoji mask file: ${outputFile}` );
    assert.ok( outputFile.includes( 'emoji_🐐' ), 'Filename should contain emoji mask info' );
    fs.unlinkSync( outputFile );
} );

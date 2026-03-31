const test = require('node:test');
const assert = require('node:assert/strict');
const { renderEmojiGrid } = require('../emojiRenderer');

test( 'renderEmojiGrid returns grid with correct dimensions', () =>
{
    const grid = renderEmojiGrid( '⭐', 16, 16 );
    assert.equal( grid.length, 16, 'Grid should have 16 rows' );
    for ( const row of grid )
    {
        assert.equal( row.length, 16, 'Each row should have 16 columns' );
    }
} );

test( 'renderEmojiGrid returns grid with correct dimensions for non-square', () =>
{
    const grid = renderEmojiGrid( '🚀', 32, 16 );
    assert.equal( grid.length, 16, 'Grid should have 16 rows' );
    for ( const row of grid )
    {
        assert.equal( row.length, 32, 'Each row should have 32 columns' );
    }
} );

test( 'renderEmojiGrid contains only booleans', () =>
{
    const grid = renderEmojiGrid( '🐐', 16, 16 );
    for ( const row of grid )
    {
        for ( const val of row )
        {
            assert.equal( typeof val, 'boolean' );
        }
    }
} );

test( 'renderEmojiGrid contains both true and false values for a large enough grid', () =>
{
    const grid = renderEmojiGrid( '🐐', 64, 64 );
    let hasTrue = false;
    let hasFalse = false;
    for ( const row of grid )
    {
        for ( const val of row )
        {
            if ( val ) hasTrue = true;
            else hasFalse = true;
        }
    }
    assert.ok( hasTrue, 'Grid should contain at least one true (foreground) pixel' );
    assert.ok( hasFalse, 'Grid should contain at least one false (background) pixel' );
} );

test( 'renderEmojiGrid throws on missing emoji', () =>
{
    assert.throws( () => renderEmojiGrid( null, 16, 16 ), /required/ );
    assert.throws( () => renderEmojiGrid( '', 16, 16 ), /required/ );
    assert.throws( () => renderEmojiGrid( undefined, 16, 16 ), /required/ );
} );

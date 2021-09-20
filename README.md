# Parcel Namer Functional
A Parcel namer plugin with a functional way to give name to generated files.

### Why ?

Sometimes renaming files with regex is not handy.
Also some projects may need very specific naming functions and having to push a package to npm only for a specific project is cumbersome.

### Installation

`npm i --save-dev parcel-namer-functional`

### Usage

Add renamer to `.parcelrc`. You can optionally add `"..."` after renamer to allow Parcel's default namer to name files if functional namer to rename.

```json5
{
    "extends": "@parcel/config-default",
    "namers": [ "parcel-namer-functional", "..." ]
}
```


### Functional renamer API

Here is the API of a functional renamer.

```javascript
function rename ( filePath, fileName, bundle, bundleGraph, config, options ) {
    // filePath is output bundle default filepath
    //      ex : /root/.../dist/my-file.js
    // fileName is default fileName, or previous function transformed fileName
    //      ex : my-file.5c13ab.css
    // bundle -> @see Parcel's Bundle object
    // bundleGraph -> @sse Parcel's BundleGraph object
    // config -> @sse Parcel's config object
    // options -> @sse Parcel's options object
    
    // Return a new name
    if ( bundle.type == 'jpg' )
        return path.join('images', fileName) // -> 'images/my-image.b536c2.jpg
    else if ( bundle.type == 'mp3' )
        return path.join('audio', path.basename(filePath)) // -> audio/interview.mp3
    else
        return null // -> Will use next parcel namer from .parcelrc
}
```

You can find help about how to rename here :
- [Parcel's DefaultNamer](https://github.com/parcel-bundler/parcel/blob/v2/packages/namers/default/src/DefaultNamer.js)
- [Parcel's Namer documentation](https://v2.parceljs.org/plugin-system/namer/)


### Rename with functions from modules

`package.json` :
```json5
{
  "name" : "your-parcel-app",
  //[...]
  "parcel-namer-functional" : [
    {
      "type" : "require",
      "module" : "renamer.js", // relative to package.json
      "function" : "pleaseRename"
    }
  ]
}
```

`renamer.js` :
```javascript
const path = require('path')
module.exports = {
	pleaseRename : function ( filePath, ... ) { ... }
}
```

> If `"function"` parameter is omitted, `module.exports` will be used as renamer function.

> If `"function"` targets to an array, every functions will be called in chain.


### Rename with a function in global scope

If you use Parcel bundler API rather than CLI, you can use a global rename function.
To register a global renamer, in your code before calling `new Parcel` :

```javascript
// Register rename as global
global.__globalRename = function ( filePath, ... ) { ... }
```

And in `package.json` :
```json5
{
  "name" : "your-parcel-app",
  //[...]
  "parcel-namer-functional" : [
    {
      "type" : "global",
      "function" : "__globalRename"
    }
  ]
}
```


### Fail

To fail silently, add this property to `"require"` or `"global"` in `package.json`

```json5
{
  "name" : "your-parcel-app",
  //[...]
  "parcel-namer-functional" : [
    {
      "type" : "global",
      "function" : "thisFunctionDoesNotExists",
      "fail" : false
    },
    {
      "type" : "require",
      "module" : "thisFileDoesNotExists.js",
      "function" : "thisFunctionDoesNotExists",
      "fail" : false
    }
  ]
}
```

# Examples

Here are some examples of functional renamers :

`parcel-rename.js` :
```javascript
const assetExtensions = {
    // https://developer.mozilla.org/fr/docs/orphaned/Web/HTML/Preloading_content
    audio: ['wav', 'mp3', 'ogg', 'aac', 'flac'],
    document: ['html', 'htm'],
    //embed
    //fetch
    font: ['woff', 'woff2', 'ttf', 'otf', 'eot'],
    image: ['jpg', 'jpeg', 'gif', 'png', 'apng', 'svg', 'avif', 'webp', 'ico', 'bmp'],
    //object
    script: ['js'],
    style: ['css'],
    //track
    //worker
    video: ['mp4', 'webm', 'flv', 'avi', 'mov', 'mkv', 'ogv'],
}

/**
 * All assets, but html documents, will be in put inside directory parameter.
 */
function createAllAssetsInDirectoryRenamer ( directory = 'assets' ) {
	return function allAssetsInDirectoryRenamer ( filePath, fileName, bundle, bundleGraph, appOptions ) {
		let name = ''
		Object.keys( SolidNamerPlugin.assetExtensions ).map( assetType => {
			if ( assetType == 'document' ) return;
			if ( SolidNamerPlugin.assetExtensions[assetType].includes( bundle.type ) )
				name = directory
		})
		return path.join(name, fileName);
	}
}

/**
 * All assets are put inside their type directory.
 * Ex : audio/track.mp3, video/help.mp4, images/flower.jpg ...
 */
function createAssetsByTypeRenamer () {
	return function assetsInDirectoryByTypeRenamer ( filePath, fileName, bundle, bundleGraph, appOptions ) {
		let name = ''
		Object.keys( SolidNamerPlugin.assetExtensions ).map( assetType => {
			if ( assetType == 'document' ) return;
			if ( SolidNamerPlugin.assetExtensions[assetType].includes( bundle.type ) )
				name += assetType + 's'
		})
		return path.join(name, fileName);
	}
}

module.exports = {
	allAssetsInStaticDirectory: createAllAssetsInDirectoryRenamer('static'),
    assetsByType: createAssetsByTypeRenamer(),
}
```

`package.json` :
```json5
{
	"parcel-namer-functional" : [
		{
			"type" : "require",
			"file" : "parcel-rename.js",
			"function" : "allAssetsInStaticDirectory"
		}
	]
}
```
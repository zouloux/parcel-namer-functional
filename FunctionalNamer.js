"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const Plugin = require("@parcel/plugin");
const path = require('path')
const fs = require('fs')

// -----------------------------------------------------------------------------

const _globalPrivateKey = '__ParcelNamerFunctions__'
const _packageConfigKey = 'parcel-namer-functional'

// ----------------------------------------------------------------------------- HELPERS

function halt ( message, code =1 ) {
	console.error(`${_packageConfigKey} - ${message}`)
	process.exit(code);
}

const basenameWithoutExtension = f => path.basename(f, path.extname(f))

const defaultNamer = ( filePath, bundle ) => {
	// Compose file name
	let name = ''
	// Get base name parent-dir/BASE_NAME.extension
	name += basenameWithoutExtension( filePath )
	// Add hash
	if ( !bundle.needsStableName )
		name += '.' + bundle.hashReference
	// Add extension
	name += '.' + bundle.type
	return name;
}

// ----------------------------------------------------------------------------- CONFIG

let _config = [
	{
		type: 'global',
		function: _globalPrivateKey,
		fail: false,
	}
]

// ----------------------------------------------------------------------------- PLUGIN

exports.default = new Plugin.Namer({

	/**
	 * Init config
	 */
	async loadConfig ({ options }) {
		const packageJson = fs.readFileSync( path.join(options.projectRoot, 'package.json') ).toString();
		const packageData = JSON.parse(packageJson);
		if ( _packageConfigKey in packageData )
			_config = [
				..._config,
				...packageData[ _packageConfigKey ]
			]
	},

	/**
	 * Rename a bundle
	 */
	async name ({ bundle, bundleGraph, config, options }) {
		// Load config
		if ( !_config )
			await this.loadConfig({options})

		// Target bundle info
		const bundleGroup = bundleGraph.getBundleGroupsContainingBundle( bundle )[0]
		const { entryAssetId } = bundleGroup
		const assets = bundle.getEntryAssets()
		//const isEntry = bundleGraph.isEntryBundleGroup( bundleGroup )

		// Target main asset from bundle
		let mainAsset = assets.find( a => a.id === entryAssetId )

		// FIXME : Better that selecting first asset ? Check entry point ?
		if ( !mainAsset && 0 in assets )
			mainAsset = assets[0]

		// Main name not found, let next plugin define name
		// FIXME : Should always find. Is this test even relevant ?
		if ( !mainAsset )
			return null;

		// Get file path from main asset
		const { filePath } = mainAsset

		// Get default file name
		let defaultFileName = defaultNamer( filePath, bundle );

		// Browse functions to call in config and get a selectedName
		let selectedFileName
		_config.map( renamer => {
			let functionToCall;

			// Call a global function
			if ( renamer.type === 'global' ) {
				// Check if function exists
				if ( !(renamer.function in global) ) {
					renamer.fail !== false && halt(`Function ${renamer.function} not found in global`);
					return
				}
				// Target function
				functionToCall = global[ renamer.function ]
			}

			// Call a function in a module
			else if ( renamer.type === 'require' ) {
				// Target module path
				const modulePath = path.join(options.projectRoot, renamer.file)
				if ( !fs.existsSync( renamer.file ) ) {
					renamer.fail !== false && halt(`Module ${modulePath} not found`)
					return;
				}
				// Require module
				let module
				try {
					module = require( modulePath )
				}
				catch (e) {
					if ( renamer.fail !== false ) {
						console.error(e)
						halt(`Error in module ${renamer.file}`)
					}
				}
				// Use module default
				if ( !renamer.function )
					functionToCall = module
				else {
					// Check if function exists
					if ( !module || !(renamer.function in module) ) {
						renamer.fail !== false && halt(`Function ${renamer.function} not found in module ${renamer.file}`);
						return;
					}
					// Target function
					functionToCall = module[ renamer.function ]
				}
			}
			else
				halt(`Invalid renamer type ${renamer.type}`);

			// Call renamer functions if it exists
			const functionsToCall = (Array.isArray(functionToCall) ? functionToCall : [functionToCall])
			functionsToCall.map( f => {
				// Rename and pass previous result or defaultFileName
				const name = f && f( filePath, selectedFileName ?? defaultFileName, bundle, bundleGraph, config, options )
				// Keep this result if we go one
				if ( name ) selectedFileName = name
			})
		})

		return selectedFileName
	},
});
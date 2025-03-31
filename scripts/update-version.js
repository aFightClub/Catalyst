const fs = require("fs");
const path = require("path");

// Read version from package.json
const packageJson = require("../package.json");
const version = packageJson.version;

// Path to version.txt file
const versionFilePath = path.join(__dirname, "../src/version.txt");

// Write version to version.txt
fs.writeFileSync(versionFilePath, version);

console.log(`Version updated to ${version} in src/version.txt`);

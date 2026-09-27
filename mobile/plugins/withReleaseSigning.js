// Signs release builds with the upload key from ../signing/keystore.properties
// (git-ignored). Without that file, release falls back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE = `
        release {
            def propsFile = rootProject.file('../../signing/keystore.properties')
            if (propsFile.exists()) {
                def props = new Properties()
                propsFile.withInputStream { props.load(it) }
                storeFile rootProject.file('../../signing/' + props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("signing/keystore.properties")) {
      g = g.replace(/signingConfigs \{\n/, (m) => m + RELEASE.slice(1) + '\n');
      g = g.replace(
        /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
        "$1signingConfig rootProject.file('../../signing/keystore.properties').exists() ? signingConfigs.release : signingConfigs.debug",
      );
    }
    cfg.modResults.contents = g;
    return cfg;
  });

#!/usr/bin/env bash
set -euo pipefail

# Execute on macOS with Xcode and CocoaPods. The GitHub workflow supplies this host.
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Este script compila no macOS/Xcode. Use o workflow GitHub Actions para executá-lo sem um Mac local." >&2
  exit 1
fi
command -v xcodebuild >/dev/null
command -v pod >/dev/null
command -v node >/dev/null

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
export CI=1
export RCT_NO_LAUNCH_PACKAGER=1
export FORCE_BUNDLING=1
export NODE_BINARY="$(command -v node)"

BUILD_ROOT="$PROJECT_ROOT/build/ios-unsigned"
OUTPUT_ROOT="$PROJECT_ROOT/output"
ARCHIVE_PATH="$BUILD_ROOT/PTCGMAP.xcarchive"
PACKAGE_ROOT="$BUILD_ROOT/package"
mkdir -p "$BUILD_ROOT" "$OUTPUT_ROOT"

# Generates the native iPhone project; npm ci must have run first.
npx --no-install expo prebuild --platform ios --no-install
NATIVE_PROJECT="$(node -e 'const fs = require("fs"); const p = fs.readdirSync("ios").filter(x => x.endsWith(".xcodeproj")); if (p.length !== 1) throw Error("Expected one Xcode project"); process.stdout.write(p[0].replace(/\.xcodeproj$/, ""))')"
pod install --project-directory=ios

# 'generic/platform=iOS' + iphoneos builds for devices, not the simulator.
# The Release configuration embeds the JS/Hermes bundle, without a Metro server.
xcodebuild \
  -workspace "$PROJECT_ROOT/ios/$NATIVE_PROJECT.xcworkspace" \
  -scheme "$NATIVE_PROJECT" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$BUILD_ROOT/DerivedData" \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER="" \
  2>&1 | tee "$BUILD_ROOT/xcodebuild.log"

APP_PATH="$ARCHIVE_PATH/Products/Applications/$NATIVE_PROJECT.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Build não produziu PTCGMAP.app. Consulte xcodebuild.log." >&2
  exit 1
fi
APP_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP_PATH/Info.plist")"
test -f "$APP_PATH/$APP_EXECUTABLE"
xcrun lipo "$APP_PATH/$APP_EXECUTABLE" -verify_arch arm64
test -f "$APP_PATH/main.jsbundle"
if [[ -e "$APP_PATH/embedded.mobileprovision" || -d "$APP_PATH/_CodeSignature" ]]; then
  echo "O build contém provisionamento ou assinatura inesperados; IPA não empacotado." >&2
  exit 1
fi

# Recreate only this script's staging directory. Never package JS alone as an IPA.
if [[ -d "$PACKAGE_ROOT" ]]; then
  rm -rf "$PACKAGE_ROOT"
fi
mkdir -p "$PACKAGE_ROOT/Payload"
ditto "$APP_PATH" "$PACKAGE_ROOT/Payload/$NATIVE_PROJECT.app"
IPA_PATH="$OUTPUT_ROOT/PTCGMAP-unsigned.ipa"
if [[ -f "$IPA_PATH" ]]; then
  rm "$IPA_PATH"
fi
(
  cd "$PACKAGE_ROOT"
  /usr/bin/zip -qry -y "$IPA_PATH" Payload
)
(
  cd "$OUTPUT_ROOT"
  shasum -a 256 PTCGMAP-unsigned.ipa > PTCGMAP-unsigned.ipa.sha256
)
echo "IPA sem assinatura gerado: $IPA_PATH"

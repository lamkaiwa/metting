#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v xcodebuild >/dev/null || { echo '需要安装 Xcode 的 Mac。'; exit 1; }
mkdir -p output
case "${1:-simulator}" in
  simulator)
    xcodebuild -project Tongpin.xcodeproj -scheme Tongpin -configuration Debug \
      -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
      -derivedDataPath output/DerivedData CODE_SIGNING_ALLOWED=NO build
    ;;
  archive)
    : "${TONGPIN_TEAM_ID:?请设置自己的 Apple 开发者 Team ID}"
    xcodebuild -project Tongpin.xcodeproj -scheme Tongpin -configuration Release \
      -destination 'generic/platform=iOS' -archivePath output/Tongpin.xcarchive \
      DEVELOPMENT_TEAM="$TONGPIN_TEAM_ID" -allowProvisioningUpdates archive
    ;;
  test)
    : "${TONGPIN_SIMULATOR_DESTINATION:?请设置模拟器 destination，例如 platform=iOS Simulator,id=模拟器UUID}"
    xcodebuild -project Tongpin.xcodeproj -scheme Tongpin -configuration Debug \
      -destination "$TONGPIN_SIMULATOR_DESTINATION" -derivedDataPath output/DerivedData \
      CODE_SIGNING_ALLOWED=NO test
    ;;
  *) echo '用法：bash scripts/build-mac.sh [simulator|test|archive]'; exit 1;;
esac

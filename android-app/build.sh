#!/usr/bin/env bash
# בונה את אפליקציית האנדרואיד (APK חתום) בלי Android Studio:
#   KEYSTORE=/path/yamshopping.p12 KEYSTORE_PASSWORD=... ./build.sh           — האפליקציה הרגילה
#   KEYSTORE=/path/yamshopping.p12 KEYSTORE_PASSWORD=... ./build.sh offline   — 📴 "רשימת קניות אופליין" (בלי אינטרנט, offline/)
# צריך: Java 17+, Python 3, curl. הכלים יורדים פעם אחת לתיקייה .tools (ונבדקים לפי טביעת אצבע).
# הפלט: dist/yamshopping-<version>.apk (או dist/yamshopping-offline-<version>.apk)
set -euo pipefail
cd "$(dirname "$0")"
TOOLS=.tools
BUILD=build
mkdir -p "$TOOLS" "$BUILD" dist

fetch() { # url file sha256
  if [ ! -f "$TOOLS/$2" ] || ! echo "$3  $TOOLS/$2" | sha256sum -c --quiet - 2>/dev/null; then
    echo "⬇️  $2"
    curl -fsSL "$1" -o "$TOOLS/$2.part"
    echo "$3  $TOOLS/$2.part" | sha256sum -c --quiet -
    mv "$TOOLS/$2.part" "$TOOLS/$2"
  fi
}
# aapt2 ומשאבי אנדרואיד 16 — מתוך Apktool (Maven Central)
fetch https://repo1.maven.org/maven2/org/apktool/apktool-cli/3.0.3/apktool-cli-3.0.3.jar apktool-cli.jar 29fc610eed9dd349e75d40fd5af02538e0118b08d56a61ef6f53f8256adadc9a
# ממשקי אנדרואיד לקומפילציה — Robolectric (Maven Central)
fetch https://repo1.maven.org/maven2/org/robolectric/android-all/15-robolectric-13954326/android-all-15-robolectric-13954326.jar android-all.jar e17105f6c432357e6bb278a527f8e848d01fc56ccee01be77725bea23d871990
# D8 (ממיר ל-dex) — R8 של גוגל
fetch https://storage.googleapis.com/r8-releases/raw/8.5.35/r8lib.jar r8lib.jar 4733945987ee0a840fafc34080b135259e01678412e07212b23f706334290294
# חתימה — apksig של גוגל (Maven Central)
fetch https://repo1.maven.org/maven2/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar apksig.jar 9637078c0016244e4be0941836295365a7e2e5b164c59cb7885783c40460bfee
if [ ! -x "$TOOLS/aapt2" ]; then
  unzip -o -q -j "$TOOLS/apktool-cli.jar" prebuilt/linux/aapt2 prebuilt/android-framework.jar -d "$TOOLS"
  chmod +x "$TOOLS/aapt2"
fi

: "${KEYSTORE:?KEYSTORE (קובץ המפתח) לא הוגדר}"
: "${KEYSTORE_PASSWORD:?KEYSTORE_PASSWORD לא הוגדר}"
ALIAS="${KEYSTORE_ALIAS:-yamshopping}"
FLAVOR="${1:-app}"
if [ "$FLAVOR" = offline ]; then
  MANIFEST=offline/AndroidManifest.xml
  RENAME=(--rename-manifest-package com.yamshopping.offline)
  # רק מה שהאפליקציה האופליין צריכה: בלי עדכונים מהאינטרנט, התראות או בדיקות ברקע
  SRCS=(offline/src src/com/yamshopping/app/Offline.java src/com/yamshopping/app/Bt.java src/com/yamshopping/app/Crash.java src/com/yamshopping/app/Place.java)
  NAME=yamshopping-offline
else
  MANIFEST=AndroidManifest.xml
  RENAME=()
  SRCS=(src)
  NAME=yamshopping
fi
VERSION=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$MANIFEST")

rm -rf "$BUILD"/*
# 🧳 2.1: עותק של האתר בתוך האפליקציה — נפתח רק כשאין אינטרנט ואין עותק שמור (Offline.java).
# נלקח מ-shopping-list-site כמו שהוא בזמן הבנייה; בכל מצב אחר האפליקציה טוענת את האתר החי
echo "🧳 עותק האתר"
SITE=../shopping-list-site
OFF="$BUILD/assets/site"
mkdir -p "$OFF"
cp "$SITE/index.html" "$SITE/manifest.webmanifest" "$SITE/favicon.png" "$SITE/favicon.ico" "$SITE/logo.png" "$SITE/logo-2.svg" "$SITE/cities-il.json" "$OFF/"
cp -r "$SITE/js" "$SITE/vendor" "$SITE/icons" "$OFF/"

echo "🧩 משאבים"
"$TOOLS/aapt2" compile --dir res -o "$BUILD/res.zip"
mkdir -p "$BUILD/gen"
"$TOOLS/aapt2" link -I "$TOOLS/android-framework.jar" --manifest "$MANIFEST" "${RENAME[@]}" \
  -A "$BUILD/assets" --java "$BUILD/gen" -o "$BUILD/res.apk" "$BUILD/res.zip"

echo "☕ קוד"
mkdir -p "$BUILD/classes"
javac -nowarn --release 8 -encoding UTF-8 -classpath "$TOOLS/android-all.jar" \
  -d "$BUILD/classes" $(find "${SRCS[@]}" "$BUILD/gen" -name '*.java')
mkdir -p "$BUILD/dex"
java -cp "$TOOLS/r8lib.jar" com.android.tools.r8.D8 --release --min-api 24 --lib "$TOOLS/android-all.jar" \
  --output "$BUILD/dex" $(find "$BUILD/classes" -name '*.class')

echo "📦 אריזה וחתימה"
python3 tools/zipalign.py "$BUILD/res.apk" "$BUILD/dex/classes.dex" "$BUILD/unsigned.apk"
javac -nowarn -cp "$TOOLS/apksig.jar" -d "$BUILD/signer" tools/Sign.java
OUT="dist/$NAME-$VERSION.apk"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED -cp "$TOOLS/apksig.jar:$BUILD/signer" Sign "$KEYSTORE" "$ALIAS" "$BUILD/unsigned.apk" "$OUT"
echo "✅ $OUT"

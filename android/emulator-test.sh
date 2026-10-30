#!/bin/bash
# Sanal telefonda uygulamayı kurar, açar, ekran görüntüsü ve hata kaydı alır.
SON="sonuc-$API"
mkdir -p "$SON"
adb install -r Gorunur.apk > "$SON/kurulum.txt" 2>&1
adb logcat -c
adb shell am start -W -n com.gorunur.app/.MainActivity > "$SON/acilis.txt" 2>&1
sleep 8
adb exec-out screencap -p > "$SON/ekran-8sn.png"
sleep 22
adb exec-out screencap -p > "$SON/ekran-30sn.png"
adb shell pidof com.gorunur.app > "$SON/calisiyor.txt" 2>&1 || echo "UYGULAMA KAPANMIS" > "$SON/calisiyor.txt"
adb logcat -d > "$SON/logcat.txt"
adb logcat -d -b crash > "$SON/cokme.txt"
true

# Sweet Pop — لعبة حلوى (3 في صف) بدون إنترنت — 120 مرحلة

## التنصيب (على حاسوب Zorin، والهاتف موصول بـ USB وفيه وضع المطور)
```
sudo apt install pipx   # مرة واحدة
pipx install clickable-ut
pipx ensurepath         # ثم أعد فتح الطرفية
cd sweetpop
clickable desktop       # تجربة على الحاسوب أولاً (اختياري)
clickable build   # يبني الحزمة للهاتف
clickable install # ينصّبها على الهاتف
```
أو مباشرة: `clickable` (يبني ويثبّت ويشغّل).

## ملاحظات
- لم أستطع تجربتها على جهاز Ubuntu Touch حقيقي من هنا؛ اللعبة نفسها مُختبرة في متصفح بحجم الهاتف.
- إن ظهرت شاشة فارغة: جرّب في `qml/Main.qml` استبدال `import QtWebEngine 1.10` بنسخة أقدم (`1.8`)، وأرسل لي رسالة الخطأ من `clickable logs`.
- الاختبارات: `node tests/core.test.js`.

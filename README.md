# DCreator – אתר סטטי

אין שלב build. `index.html` חייב להיות בשורש (root) של הריפו / התיקייה שמועלית.

## העלאה לגיטהאב ומשם ל-Netlify
1. חלצו את ה-zip. בתוכו: `index.html`, `css/`, `js/`, `assets/`.
2. ב-GitHub: **New repository** (למשל `dcreator-site`) → **uploading an existing file** → גררו פנימה את **תוכן** התיקייה (לא את התיקייה עצמה) → **Commit changes**.
3. ב-Netlify: **Add new site → Import an existing project → GitHub** → בחרו את הריפו.
   - Build command: ריק
   - Publish directory: ריק (או `.`)
   - **Deploy**.

העלאה ישירה בלי גיטהאב: Netlify → **Add new site → Deploy manually** → גררו את התיקייה.

## יצירת קשר
טופס יצירת הקשר והשאלון נשלחים דרך הוואטסאפ או האימייל של הגולש: לחיצה פותחת את האפליקציה שלו עם ההודעה מוכנה, מופנית אליכם (055-9112028 / eldarhay33@gmail.com). אין שרת ואין צורך בהפעלה כלשהי.

## סטטיסטיקת גולשים אמיתית (מדינות, ממוצע ליום)
התיקייה `netlify/functions` והקובץ `package.json` מפעילים ספירה אנונימית ב-Netlify (בלי עוגיות ובלי שמירת כתובת IP).
חובה להעלות אותם לגיטהאב יחד עם שאר הקבצים. אחרי ה-Deploy: לוח ניהול ← אנליטיקה מציג מאיפה הגולשים, ממוצע כניסות ליום וזמן שהייה.
אם משנים את קוד הגישה, צריך לעדכן את ה-hash גם ב-`netlify/functions/stats.mjs`.

## הגדרות שכדאי להכיר
- `js/config.js` – טלפון, וואטסאפ, לוגו (`logoMode`: `svg` / `image` / `both`), קוד גישה (hash).
- `js/portfolio-data.js` – תיק העבודות שכל המבקרים רואים. עדכון: לוח ניהול → "Download portfolio-data.js" → החליפו את הקובץ הזה בריפו (Netlify יתעדכן אוטומטית).

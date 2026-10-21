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

## הגדרות שכדאי להכיר
- `js/config.js` – טלפון, וואטסאפ, לוגו (`logoMode`: `svg` / `image` / `both`), קוד גישה (hash).
- `js/portfolio-data.js` – תיק העבודות שכל המבקרים רואים. עדכון: לוח ניהול → "Download portfolio-data.js" → החליפו את הקובץ הזה בריפו (Netlify יתעדכן אוטומטית).

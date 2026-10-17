(() => {
  'use strict';
  const keys = {language:'skykef_manifest_language', textSize:'skykef_manifest_text_size'};
  function read(key, allowed, fallback) { try { const value=localStorage.getItem(key); return allowed.includes(value)?value:fallback; } catch { return fallback; } }
  const state = {language:read(keys.language,['en','he'],'en'),textSize:read(keys.textSize,['normal','large'],'normal')};
  const he = {
    'Jumping Day Registration':'הרשמה ליום פעילות','Open in Google Forms ↗':'פתיחה ב־Google Forms ↗','Loading form…':'טוען טופס…','Registration form':'טופס הרשמה','SkyKef jumping day registration form':'טופס הרשמה ליום פעילות בסקיכיף',
    'Filter logbook':'סינון יומן צניחות','Jump types':'סוגי צניחות','From date':'מתאריך','To date':'עד תאריך','Sort order':'סדר מיון','Newest first':'מהחדש לישן','Oldest first':'מהישן לחדש','Reset filters':'איפוס סינון','No jumps match the selected filters.':'לא נמצאו צניחות התואמות לסינון.','Start date must be on or before end date.':'תאריך ההתחלה צריך להיות מוקדם מתאריך הסיום או שווה לו.',
    'App Guide':'מדריך לאפליקציה','Open in Google Sheets ↗':'פתיחה ב־Google Sheets ↗','Registration spreadsheet':'גיליון הרשמה','Sort by jumps':'מיון לפי צניחות','Most to fewest':'מהכי הרבה להכי מעט','Fewest to most':'מהכי מעט להכי הרבה','Most to fewest ↓':'מהכי הרבה להכי מעט ↓','Fewest to most ↑':'מהכי מעט להכי הרבה ↑','Sort by jumps: most to fewest':'מיון צניחות: מהכי הרבה להכי מעט','Sort by jumps: fewest to most':'מיון צניחות: מהכי מעט להכי הרבה','Print load':'הדפסת יעף','Altitude':'גובה','Type':'סוג','Video for':'צילום עבור','Settings':'הגדרות','Close':'סגירה','Close settings':'סגירת הגדרות','Appearance':'מראה','Dark Mode':'מצב כהה','Light Mode':'מצב בהיר','Text size':'גודל טקסט','Normal':'רגיל','Large':'גדול','Language':'שפה',
    'Loads':'יעפים','My Profile':'הפרופיל שלי','My Logbook':'יומן הצניחות שלי','My information':'המידע שלי','My account':'החשבון שלי','Registration':'הרשמה','Registration Form':'טופס הרשמה','Daily Report':'דוח יומי','Logout':'התנתקות','Login':'התחברות','Home':'בית','Refresh':'רענון',
    "Today's Loads":'היעפים של היום','Load Details':'פרטי היעף','Jumper':'צנחן','Activity':'פעילות','Details':'פרטים','In air':'באוויר','Next load':'היעף הבא','Day has not started yet':'יום הפעילות עדיין לא התחיל',"Today's loads will appear here when they are ready.":'היעפים של היום יופיעו כאן כשיהיו מוכנים.',
    'Checking today’s loads…':'בודק את היעפים של היום…',"Checking today's loads…":'בודק את היעפים של היום…','Loading current date…':'טוען תאריך…','Loading current loads…':'טוען יעפים…','Could not load the current loads.':'לא ניתן לטעון את היעפים.','No load is currently in air.':'כרגע אין יעף באוויר.','Date unavailable':'התאריך אינו זמין','No jumper records in this load.':'אין צנחנים ביעף זה.',
    'Your personal details and logbook':'הפרטים האישיים ויומן הצניחות שלך','Loading profile…':'טוען פרופיל…','Could not load your profile.':'לא ניתן לטעון את הפרופיל שלך.','Name':'שם פרטי','Surname':'שם משפחה','Phone':'טלפון','Weight':'משקל','Emergency':'איש קשר לחירום','Worker':'תפקידי עובד','Is Rental':'ציוד שכור','Last Jump Date':'תאריך צניחה אחרונה','Reserve Date':'תאריך קיפול רזרבי','Number Of Jumps':'מספר צניחות','Yes':'כן','No':'לא',
    'Export CSV':'ייצוא CSV','Open this tab to load your logbook.':'פתחו לשונית זו לטעינת יומן הצניחות.','Loading your logbook…':'טוען את יומן הצניחות שלך…','No logbook history found.':'לא נמצאה היסטוריית צניחות.','Could not load your logbook.':'לא ניתן לטעון את יומן הצניחות שלך.','Your profile does not have a UID.':'לפרופיל שלך לא מוגדר UID.','Date':'תאריך','Load':'יעף','Annual Jump Statistics':'סטטיסטיקת צניחות שנתית','Year':'שנה','Total':'סה״כ',
    'Username':'שם משתמש','Password':'סיסמה','Enter your username and password.':'הזינו שם משתמש וסיסמה.','Checking…':'בודק…','Incorrect username or password.':'שם המשתמש או הסיסמה שגויים.','Could not verify login. Check Firebase access.':'לא ניתן לאמת את ההתחברות. בדקו את הגישה לשרת.','Close login':'סגירת התחברות',
    'Available details were filled from your profile. You can edit them before submitting.':'הפרטים הזמינים מולאו מהפרופיל שלך. אפשר לערוך אותם לפני השליחה.','Back to Home':'חזרה לבית','Open in a new tab':'פתיחה בלשונית חדשה','Open Form':'פתיחת הטופס',
    'Worker name':'שם','Reload Data':'רענון נתונים','Loading daily report…':'טוען דוח יומי…','No workers found on this day’s loads.':'לא נמצאו עובדים ביעפים של יום זה.','No loads found for the selected date.':'לא נמצאו יעפים בתאריך שנבחר.','No work days available in history.':'לא נמצאו ימי פעילות בהיסטוריה.','Could not load the daily report. Please try again.':'לא ניתן לטעון את הדוח היומי. נסו שוב.','Choose work day':'בחירת יום פעילות','Previous month':'החודש הקודם','Next month':'החודש הבא','Month':'חודש','Main navigation':'ניווט ראשי',
    'Jumpers Data':'נתוני צנחנים','Today Jumpers':'צנחני היום','Loads History':'היסטוריית יעפים','Reports':'דוחות'
  };
  function translate(value) {
    if(state.language!=='he')return value;
    if(Object.hasOwn(he,value))return he[value];
    let m;
    if((m=value.match(/^(\d+) jumpers?$/)))return `${m[1]} צנחנים`;
    if((m=value.match(/^Load (\d+)( · (In air|Next load))?$/)))return `יעף ${m[1]}${m[3]?' · '+he[m[3]]:''}`;
    if((m=value.match(/^Load (\d+) is in air\.$/)))return `יעף ${m[1]} באוויר.`;
    if((m=value.match(/^(\d+) jumpers? · (\d+) (?:canopy|canopies)$/)))return `${m[1]} צנחנים · ${m[2]} מצנחים`;
    if((m=value.match(/^(\d+) load(s)? today · (\d+) total jumper slot(s)?$/)))return `${m[1]} יעפים היום · ${m[3]} מקומות צנחנים בסך הכול`;
    if((m=value.match(/^(\d+) logbook entr(?:y|ies) · newest first$/)))return `${m[1]} רשומות ביומן · מהחדש לישן`;
    if((m=value.match(/^(\d+) logbook entr(?:y|ies) · oldest first$/)))return `${m[1]} רשומות ביומן · מהישן לחדש`;
    if((m=value.match(/^(\d+) worker(s)? · (\d+) load(s)?$/)))return `${m[1]} עובדים · ${m[3]} יעפים`;
    return value.replace(/^Jumps so far — /,'צניחות עד כה — ').replace(/^Jumps Today — /,'צניחות היום — ').replace(/^CURRENT: /,'נוכחי: ').replace(/^PAST: /,'קודמים: ').replace(/^Loads: /,'יעפים: ').replace('No current loads','אין יעפים נוכחיים').replace('No past loads','אין יעפים קודמים').replace('No jumps today','אין צניחות היום').replace(/^Day ended · (\d+) loads? today$/,'יום הפעילות הסתיים · $1 יעפים היום');
  }
  const textRecords=new WeakMap(), attrRecords=new WeakMap();
  const excluded='script,style,textarea,input,iframe,#profileName,#sessionRole,.profile-detail-row dd,.load-jumper-name,#dailyReportBody .worker-column,.worker-name,.load-video-connection bdi';
  function applyTranslations() {
    if(!document.body)return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(!node.parentElement || node.parentElement.closest(excluded) || !node.nodeValue.trim())continue;
      const current=node.nodeValue;
      let record=textRecords.get(node);
      if(!record || current!==record.output)record={original:current};
      const trimmed=record.original.trim();
      const output=record.original.replace(trimmed,translate(trimmed));
      record.output=output; textRecords.set(node,record);
      if(current!==output)node.nodeValue=output;
    }
    document.querySelectorAll('[aria-label],[placeholder],[title]').forEach(element=>{
      if(element.closest(excluded))return;
      const records=attrRecords.get(element)||{};
      for(const attr of ['aria-label','placeholder','title']) {
        if(!element.hasAttribute(attr))continue;
        const current=element.getAttribute(attr);let r=records[attr];
        if(!r || current!==r.output)r={original:current};
        r.output=translate(r.original);records[attr]=r;
        if(current!==r.output)element.setAttribute(attr,r.output);
      }
      attrRecords.set(element,records);
    });
  }
  function apply() {
    document.documentElement.lang=state.language;
    document.documentElement.dir=state.language==='he'?'rtl':'ltr';
    document.documentElement.dataset.textSize=state.textSize;
    applyTranslations();
  }
  function set(name,value) {
    const allowed=name==='language'?['en','he']:name==='textSize'?['normal','large']:[];
    if(!allowed.includes(value))return;
    state[name]=value;try{localStorage.setItem(keys[name],value);}catch{}
    apply();
  }
  window.SkyKefPreferences={get:()=>({...state}),set,translate};
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    apply();let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;applyTranslations();});}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});
  });
})();

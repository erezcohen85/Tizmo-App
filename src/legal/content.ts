export type LegalSection = { heading: string; body: string }

export const TERMS_VERSION = '2026-09-04'

const en: LegalSection[] = [
  {
    heading: '1. Parties & acceptance',
    body: 'These Terms of Use and Privacy Notice ("Terms") are an agreement between Erez Cohen, operating the Tizmo attendance-tracking service ("Provider", "we"), and you, the music teacher or ensemble director creating an account ("Teacher", "you"). By checking the agreement box during sign-up you accept these Terms in full. You must be at least 18 years old and are creating this account for professional or educational use, not as a consumer.',
  },
  {
    heading: '2. The service',
    body: 'Tizmo lets a Teacher record ensembles, students, rehearsals and events, and attendance, and optionally share read-only summaries via a link. The service is provided "as is" and "as available". We may add, change, or discontinue features, and may suspend the service for maintenance, with reasonable notice where practical.',
  },
  {
    heading: '3. Your account',
    body: 'You must provide a real, working email address and keep it accurate — it is your username and the only way we can reach you. You are responsible for keeping your password secret and for all activity under your account. Tell us immediately at tizmo.app@gmail.com if you believe your account has been compromised.',
  },
  {
    heading: '4. Your data, your responsibility',
    body: 'You alone decide what student, parent, and attendance data to enter into Tizmo, and you alone are responsible for it. Under the Israeli Privacy Protection Law, 5741-1981, as amended (including Amendment 13), you act as the owner/controller of any database you create in the service; the Provider acts only as a database holder processing data on your instructions. You are responsible for having a lawful basis and any required consents — including from parents or guardians where students are minors — for the data you enter, for complying with your school\'s or organization\'s own policies, for entering only the data you actually need, for keeping it accurate, and for responding to any request from a student or parent to access, correct, or delete their information. The Provider is not responsible for the accuracy, legality, or completeness of data you choose to enter.',
  },
  {
    heading: '5. Sharing',
    body: 'A share link you create gives read-only access to attendance history to anyone who has the link — it is not tied to a login. You alone decide whether to create a link, whom to send it to, and when to revoke it. You are solely responsible for the consequences of sharing a link, including if it is forwarded beyond who you intended. The Provider is not liable for access to your data through a share link you created.',
  },
  {
    heading: '6. How we process your data',
    body: 'Tizmo is hosted on Supabase. We do not sell your data or your students\' data. Our own staff (i.e. the Provider) may access data only to provide support, maintain the service, or comply with the law. We apply reasonable technical and organizational security measures, but no system can be guaranteed perfectly secure. If we become aware of a security breach affecting your data, we will notify you without undue delay.',
  },
  {
    heading: '7. Communications',
    body: 'We will send you transactional emails needed to operate your account (verification, password reset, service notices) regardless of any other setting. We will only send you newsletter or product-update emails if you separately opted in at sign-up or later in Settings; you may withdraw that consent at any time via an unsubscribe link or in Settings, in line with Section 30A of the Israeli Communications Law (Amendment 40).',
  },
  {
    heading: '8. Retention & deletion',
    body: 'We keep your data for as long as your account is active. You can permanently delete your account and all associated data at any time from Settings → Danger Zone; this is irreversible. Residual copies in backups are purged within 30 days of deletion. We may delete an account that has been inactive for 24 months after giving 30 days\' notice to the email on file.',
  },
  {
    heading: '9. Acceptable use',
    body: 'You may not use Tizmo to store unlawfully obtained data, to scrape or extract data at scale for purposes outside your own teaching use, to attempt to access another teacher\'s account or data, or to resell or sublicense access to the service.',
  },
  {
    heading: '10. Intellectual property',
    body: 'The Tizmo application, its design, and its code belong to the Provider. You retain ownership of the data you enter. By using the service you grant the Provider a limited license to store and process that data solely to provide the service to you.',
  },
  {
    heading: '11. Disclaimer & limitation of liability',
    body: 'The service is provided without warranties of any kind, express or implied, including fitness for a particular purpose. To the maximum extent permitted by law, the Provider\'s total liability arising from your use of the service is limited to the greater of NIS 100 or the fees you paid in the preceding 12 months, and excludes indirect, incidental, or consequential damages. Nothing in these Terms limits liability that cannot be limited under applicable law.',
  },
  {
    heading: '12. Indemnity',
    body: 'You agree to indemnify the Provider against claims, damages, or costs arising from data you entered, links you shared, or your breach of these Terms.',
  },
  {
    heading: '13. Termination',
    body: 'Either party may stop using or providing the service at any time. The Provider may suspend or terminate an account for a material breach of these Terms. On termination, Section 8 (Retention & deletion) applies.',
  },
  {
    heading: '14. Changes to these Terms',
    body: 'We may update these Terms from time to time. Material changes will be announced by email or in-app notice. Continuing to use Tizmo after a change takes effect means you accept the updated Terms; the version you last accepted is recorded on your profile.',
  },
  {
    heading: '15. Governing law & venue',
    body: 'These Terms are governed by the laws of the State of Israel. The competent courts of Tel Aviv-Jaffa have exclusive jurisdiction over any dispute. This English version is the binding text; the Hebrew version is provided for convenience.',
  },
  {
    heading: '16. Contact',
    body: 'Questions, privacy requests, or account issues: tizmo.app@gmail.com.',
  },
  {
    heading: 'Privacy notice — the data we hold about you',
    body: 'We collect your email address, a securely hashed password, your accepted Terms version and date, your newsletter preference, and basic usage/audit timestamps, solely to operate your account and the service. You may access, correct, or delete this data at any time from Settings; deleting your account removes it entirely. This notice covers only data about you as a Teacher — Section 4 above covers the student and attendance data you enter.',
  },
]

const he: LegalSection[] = [
  {
    heading: '1. הצדדים והסכמה',
    body: 'תנאי שימוש ומדיניות פרטיות אלה ("התנאים") הם הסכם בין ארז כהן, המפעיל את שירות מעקב הנוכחות Tizmo ("הספק", "אנחנו"), לבינך, מורה המוזיקה או מנהל/ת ההרכב הפותח/ת חשבון ("המורה", "אתה/את"). בסימון תיבת ההסכמה בעת ההרשמה אתה מקבל/ת תנאים אלה במלואם. עליך להיות בן/בת 18 לפחות, ואתה פותח/ת חשבון זה לשימוש מקצועי/חינוכי ולא כצרכן פרטי.',
  },
  {
    heading: '2. השירות',
    body: 'Tizmo מאפשר למורה לתעד הרכבים, תלמידים, חזרות ואירועים, ונוכחות, ולשתף באופן אופציונלי סיכומים לקריאה בלבד באמצעות קישור. השירות ניתן כפי שהוא ("as is") וכפי שזמין. אנו רשאים להוסיף, לשנות או להפסיק תכונות, ולהשעות את השירות לצורכי תחזוקה, בהודעה סבירה מראש ככל שניתן.',
  },
  {
    heading: '3. החשבון שלך',
    body: 'עליך לספק כתובת אימייל אמיתית ותקינה ולשמור אותה מעודכנת — היא שם המשתמש שלך והדרך היחידה שבה נוכל ליצור איתך קשר. אתה אחראי לשמירת הסיסמה בסוד ולכל פעילות בחשבונך. עדכן אותנו מיידית ב-tizmo.app@gmail.com אם אתה חושד שחשבונך נפרץ.',
  },
  {
    heading: '4. הנתונים שלך, האחריות שלך',
    body: 'אתה, ורק אתה, קובע אילו נתוני תלמידים, הורים ונוכחות להזין ל-Tizmo, ואתה האחראי הבלעדי להם. לפי חוק הגנת הפרטיות, התשמ"א-1981, כפי שתוקן (כולל תיקון 13), אתה פועל כבעל/בקר מסד הנתונים שאתה יוצר בשירות; הספק פועל אך ורק כמחזיק מסד נתונים המעבד מידע לפי הוראותיך. אתה אחראי לקיומה של עילה חוקית ולכל הסכמה נדרשת — לרבות מהורים או אפוטרופוסים כאשר מדובר בתלמידים קטינים — עבור הנתונים שאתה מזין, לעמידה במדיניות בית הספר או הארגון שלך, להזנת רק הנתונים הדרושים בפועל, לשמירת דיוקם, ולמענה לכל פנייה של תלמיד או הורה לעיין, לתקן או למחוק את פרטיהם. הספק אינו אחראי לדיוק, לחוקיות או לשלמות הנתונים שבחרת להזין.',
  },
  {
    heading: '5. שיתוף',
    body: 'קישור שיתוף שאתה יוצר מעניק גישה לקריאה בלבד להיסטוריית הנוכחות לכל מי שברשותו הקישור — הוא אינו קשור להתחברות. אתה, ורק אתה, מחליט האם ליצור קישור, למי לשלוח אותו, ומתי לבטלו. אתה האחראי הבלעדי לתוצאות שיתוף קישור, לרבות אם הועבר מעבר למי שהתכוונת אליו. הספק אינו אחראי לגישה לנתוניך באמצעות קישור שיתוף שיצרת.',
  },
  {
    heading: '6. כיצד אנו מעבדים את המידע',
    body: 'Tizmo מתארח על Supabase. אנו לא מוכרים את המידע שלך או של תלמידיך. הגישה למידע על ידי הצוות שלנו (הספק) מתאפשרת רק לצורך תמיכה, תחזוקת השירות, או עמידה בדרישות החוק. אנו נוקטים אמצעי אבטחה טכניים וארגוניים סבירים, אך לא ניתן להבטיח מערכת חסינה לחלוטין. אם ניוודע לפרצת אבטחה המשפיעה על נתוניך, נודיע לך ללא דיחוי בלתי סביר.',
  },
  {
    heading: '7. תקשורת',
    body: 'נשלח אליך הודעות דוא"ל תפעוליות הנחוצות להפעלת חשבונך (אימות, איפוס סיסמה, הודעות שירות) ללא תלות בכל הגדרה אחרת. נשלח אליך עלון או עדכוני מוצר רק אם הסכמת לכך בנפרד בעת ההרשמה או מאוחר יותר בהגדרות; ניתן לבטל הסכמה זו בכל עת דרך קישור הסרה מרשימת תפוצה או בהגדרות, בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים) (תיקון 40).',
  },
  {
    heading: '8. שמירה ומחיקה',
    body: 'אנו שומרים את נתוניך כל עוד חשבונך פעיל. ניתן למחוק את חשבונך ואת כל הנתונים הקשורים אליו לצמיתות בכל עת דרך הגדרות ← אזור סכנה; פעולה זו בלתי הפיכה. עותקים שיוריים בגיבויים יימחקו בתוך 30 יום מהמחיקה. אנו רשאים למחוק חשבון שאינו פעיל 24 חודשים לאחר מתן הודעה של 30 יום לכתובת הדוא"ל הרשומה.',
  },
  {
    heading: '9. שימוש מותר',
    body: 'אין להשתמש ב-Tizmo לאחסון מידע שהושג באופן לא חוקי, לגריפת נתונים בהיקף רחב למטרות מעבר לשימוש ההוראתי שלך, לניסיון לגשת לחשבון או לנתונים של מורה אחר/ת, או למכירה מחדש או להענקת רישיון משנה לגישה לשירות.',
  },
  {
    heading: '10. קניין רוחני',
    body: 'אפליקציית Tizmo, עיצובה וקוד המקור שלה שייכים לספק. אתה שומר על הבעלות בנתונים שאתה מזין. בשימושך בשירות אתה מעניק לספק רישיון מוגבל לאחסן ולעבד נתונים אלה אך ורק לצורך אספקת השירות לך.',
  },
  {
    heading: '11. הבהרה והגבלת אחריות',
    body: 'השירות ניתן ללא כל אחריות, מפורשת או משתמעת, לרבות התאמה למטרה מסוימת. במידה המרבית המותרת בחוק, אחריותו הכוללת של הספק הנובעת משימושך בשירות מוגבלת לגבוה מבין 100 ש"ח לבין הסכומים ששילמת ב-12 החודשים שקדמו לכך, ואינה כוללת נזקים עקיפים, תוצאתיים או מקריים. אין באמור בתנאים אלה כדי להגביל אחריות שלא ניתן להגבילה על פי דין.',
  },
  {
    heading: '12. שיפוי',
    body: 'אתה מסכים לשפות את הספק בגין תביעות, נזקים או עלויות הנובעים מנתונים שהזנת, קישורים ששיתפת, או הפרתך את התנאים.',
  },
  {
    heading: '13. סיום',
    body: 'כל צד רשאי להפסיק את השימוש בשירות או את מתן השירות בכל עת. הספק רשאי להשעות או לסיים חשבון בשל הפרה מהותית של התנאים. עם הסיום, יחול סעיף 8 (שמירה ומחיקה).',
  },
  {
    heading: '14. שינויים בתנאים',
    body: 'אנו עשויים לעדכן תנאים אלה מעת לעת. שינויים מהותיים יפורסמו בדוא"ל או בהודעה באפליקציה. המשך שימושך ב-Tizmo לאחר כניסת שינוי לתוקף מהווה הסכמה לתנאים המעודכנים; הגרסה שאישרת לאחרונה נשמרת בפרופיל שלך.',
  },
  {
    heading: '15. דין וסמכות שיפוט',
    body: 'תנאים אלה כפופים לדיני מדינת ישראל. לבתי המשפט המוסמכים בתל אביב-יפו סמכות שיפוט ייחודית בכל מחלוקת. הנוסח האנגלי המחייב הוא הקובע; הנוסח העברי ניתן לנוחות בלבד.',
  },
  {
    heading: '16. יצירת קשר',
    body: 'שאלות, פניות בנושא פרטיות, או בעיות בחשבון: tizmo.app@gmail.com.',
  },
  {
    heading: 'הודעת פרטיות — המידע שאנו שומרים עליך',
    body: 'אנו אוספים את כתובת הדוא"ל שלך, סיסמה מוצפנת באופן מאובטח, גרסת התנאים שקיבלת ומועד קבלתם, העדפת ניוזלטר, וחותמות זמן בסיסיות לצורכי שימוש/ביקורת, אך ורק לצורך הפעלת חשבונך והשירות. באפשרותך לעיין, לתקן או למחוק מידע זה בכל עת דרך ההגדרות; מחיקת חשבונך מסירה אותו כליל. הודעה זו חלה רק על מידע אודותיך כמורה — סעיף 4 לעיל חל על נתוני התלמידים והנוכחות שאתה מזין.',
  },
]

export const legalContent: Record<'en' | 'he', LegalSection[]> = { en, he }

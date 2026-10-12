TASKHIVE OFFLINE — Paano Gamitin
================================

MGA FILES (ilagay sa iisang folder):
  1. index.html     — ang buong TaskHive app (lahat ng features + QR + Go to GCash)
  2. manifest.json  — para ma-install bilang app sa phone
  3. sw.js          — service worker (full offline caching)

WALANG server, walang internet, walang Flask kailangan.
Lahat ng data (account, tasks, grades, etc.) nakasave sa browser mo mismo (localStorage).

------------------------------------------------------------
PARAAN 1: Pinakasimple — buksan lang ang index.html
------------------------------------------------------------
- I-double click ang index.html (o buksan sa Chrome/Firefox/Safari)
- Gumagana agad — kahit patayin ang wifi/data
- Register → Login → gamitin lahat ng features
- ⚠️ Pero HINDI ito ma-i-install bilang app icon, at hindi gagana ang sw.js
  (kailangan ng http server para sa service worker)

------------------------------------------------------------
PARAAN 2: Installable na App (recommended)
------------------------------------------------------------
Kailangan i-serve ang folder via HTTP (kahit local lang):

Sa computer (kung nasa loob ng folder):
    python3 -m http.server 8000

Tapos buksan sa browser:  http://localhost:8000
- Sa Chrome: i-click ang ⋮ (tatlong tuldok) → "Install app" / "Add to Home screen"
- Bubukas na parang totoong app — full screen, walang address bar,
  at 100% offline pagkatapos ng unang bukas.

Kung sa cellphone mo gustong i-install:
- I-upload ang 3 files sa anumang free hosting (Netlify, GitHub Pages, Vercel)
  o i-serve via local network.
- Buksan ang link sa phone browser → "Add to Home screen".

------------------------------------------------------------
MGA FEATURES (lahat offline):
------------------------------------------------------------
✅ Register / Login (local account sa device mo)
✅ Tasks (add, complete, delete, priority, due dates)
✅ Class Schedule (Mon-Sat, oras, room)
✅ Notes (4 folders: General, Reviewer, Lecture, Personal)
✅ Group Projects (members, deadline, mark as done)
✅ Grades & GPA (automatic GPA computation, 1.00-5.00 scale)
✅ Study Planner / Goals (progress bar 0-100%)
✅ Budget Tracker (Premium — auto-activated offline)
✅ Premium / GCash Payment page — QR (₱50.00) + Go to GCash button
✅ Dark / Light theme
✅ Quick stats dashboard

------------------------------------------------------------
MAHALAGANG TANDAAN:
------------------------------------------------------------
1. ⚠️ PALITAN ANG "XXXX" sa GCASH_NUMBER — buksan ang index.html sa Notepad/VS Code,
   hanapin ang "0970-456-XXXX" at palitan ng huling 4 digits ng number mo.
   (Nasa dalawang lugar: sa HTML na <span id="gcNumber"> at sa JS na
    GCASH_NUMBER_OFFLINE. Palitan ang pareho.)

2. OFFLINE MODE: Walang admin na mag-a-approve ng payment, kaya kapag
   na-click mo ang "I Have Sent Payment", AUTO-ACTIVATE agad ang Premium
   (30 days). Para sa tunay na bayad, kailangan mo pa ring mag-send ng
   ₱50 sa GCash number bago i-click.

3. Data mo ay nasa BROWSER mo lang. Kapag in-clear mo ang browser data
   o gumamit ng ibang browser/device, mawawala ang account at data mo.
   (Iba ito sa Flask version na nasa server ang data.)

4. Kung gusto mong i-export ang data: sa browser console, i-type:
      localStorage.getItem('th_store_<user_id>')
   (Makikita mo ang user_id sa DevTools → Application → Local Storage.)

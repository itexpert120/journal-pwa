# Journal PWA — Blueprint

> Transcribed from `Notes_260925_153243.pdf` (a raster screenshot with no text layer).

This is the final blueprint, updated for an **unlimited, open-ended timeline**. Users can start logging from any date. There are no end dates and no cut-offs.

## 0. Front Page: Personal Profile & Emergency Passport

*Designed as the front inside cover of the digital binder.*

### A. Personal Identification
- **Full Name & Photograph:** An area to upload a profile photo, plus full legal name, preferred name/nickname, and a slot for a digital signature.
- **Contact Information:** Phone number, primary email, residential address, and secondary/permanent address.
- **Government & Official ID Numbers:** Secure, masked fields for National ID (CNIC/SSN/Passport Number), Tax Identification Number, and Driving License Number.

### B. Medical Profile & Quick Reference
- **Basic Biometrics:** Blood group (A+, O-, etc.), date of birth, age, height (cm/ft), and baseline weight.
- **Primary Care & Specialists:**
  - *Primary Doctor:* Name, clinic/hospital, phone number.
  - *Specialists (Cardiologist, General Physician, etc.):* Name, contact, clinic location.
- **Critical Health Information:**
  - **Known Allergies:** Drug, food, or environmental allergies, highlighted in red.
  - **Chronic Conditions:** Pre-existing conditions (e.g., hypertension, diabetes, asthma).
  - **Current Regular Medications:** Baseline daily prescriptions with dosage details.
  - **Health Insurance Data:** Insurance provider, policy/card number, helpline number.

### C. Emergency Contacts
- **Primary Emergency Contact:** Name, relationship (e.g., spouse, son, daughter), mobile number, alternate phone.
- **Secondary Emergency Contact:** Name, relationship, mobile number.

## 1. Core UI/UX Framework
- **Timeline Architecture:** A dynamic perpetual calendar with an unlimited year range. There is no start year or end year. Past and future dates are generated automatically.
- **Navigation Style:** A page-flip animation that mimics a physical binder or leather journal. Dynamic year/month tab dividers run along the side, with a permanent **"Profile"** tab on top.
- **Top Bar (Header):**
  - **Date Selector:** A full interactive date picker (day / month / year) to go to any past entry or future date.
  - **Quick Jump Controls:** A "Today" button, a "Profile" button, and calendar search.
  - **Input Mode Toggle:** Handwrite (stylus/pencil) | Type (keyboard) | Voice note.
  - **Export/Share:** A PDF exporter, with options to export custom date ranges, medical summaries, or the profile page.

## 2. Daily Entry Screen Layout

### Header Block
- **Daily Mood & Energy Trackers:** A 5-point icon selector. Mood: 😊 😐 😔 😤 😴. Energy: 🔋 20% to 100%.
- **Weather Widget:** Temperature and icon fetched automatically, with an option to edit by hand.
- **Daily Quote / Affirmation:** A dynamic motivational prompt at the top of the page.

### Section A: Health & Vitals Ledger
| Field | Type | Details |
|---|---|---|
| Blood Pressure (BP) | Number inputs | Systolic / diastolic (mmHg) + pulse rate (bpm) |
| ECG / Heart Logs | Attachment / data | File/image upload for ECG printouts + status tagging (Normal, Arrhythmia, etc.) |
| Weight & Body | Number input | Weight (kg/lbs) + body fat % (optional) |
| Medicines Taken | Checklist | Time-stamped medication list with checkboxes and dosage badges |
| Medical Checkups | Reminder/note | Doctor appointments, clinic visits, test result attachments, follow-up dates |

### Section B: Fitness, Diet & Activity Log
- **Walk & Steps:** Step count synced automatically (Apple Health / Google Fit) or entered by hand, plus distance (km/miles).
- **Exercise & Workouts:**
  - *Dropdown:* Cardio, Strength, Yoga, Swimming, Custom.
  - *Inputs:* Duration (mins) + intensity rating + calories burned.
- **Diet Log:**
  - *Meal Slots:* Breakfast, Lunch, Dinner, Snacks.
  - *Format:* Water intake counter (glasses/liters) + macro/calorie summary or a photo of the meal plate.

### Section C: Productivity & Work Routine
- **Daily Routine & Tasks:** A checklist for daily non-negotiable tasks (e.g., morning routine, work shift, reading).
- **Important Events:** A timed schedule block (a time ladder from 06:00 AM to 10:00 PM).
- **Milestones & Occasions:**
  - **Birthdays & Anniversaries:** A banner tag for contacts celebrated today, with alerts that repeat every year.
  - **Goals & Achievements:** Today's micro-goals + a "Win of the Day" log.

### Section D: Personal Journal & Memories (Free-Form Canvas)
- **Journaling Workspace:** A dual-mode page (lined or grid paper background) that supports typed text, handwriting with a digital pen/stylus, and audio notes recorded directly.
- **Media Gallery Grid:**
  - **Photo Attachments:** A grid for adding photos taken today.
  - **Memories/Captions:** An option to tag photos with a location, tags (e.g., #Family, #Travel), and short captions.

## 3. Technical Requirements for Application Developers
1. **Unlimited Database Indexing:** Structure the database with Unix timestamps or ISO-8601 date strings (YYYY-MM-DD), not hardcoded year tables, so it scales across decades.
2. **Input Versatility:** An integrated canvas library (e.g., Apple PencilKit for iOS or the Drawing API for Android) layered over standard text fields.
3. **Health Integrations:** HealthConnect / Apple HealthKit API integrations that sync steps, weight, heart rate, and BP device data automatically.
4. **Search & Filter System:** Global search with filters for text, tags (#health, #birthday), date ranges, and medical logs.
5. **Security & Privacy:** Biometric lock (FaceID/fingerprint), encrypted local storage for personal ID/tax data, and end-to-end encrypted cloud backup (iCloud/Google Drive).
6. **Notifications Engine:** A recurring engine for daily journaling prompts, medication alerts, and annual events (birthdays/anniversaries).

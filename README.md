# OFFDP — Offline-First Field Data Platform (Digital Census 2026)

**Authors**: Reetik Sil, Narayan Chetri, Dipankar Das  
**Programme**: Master of Computer Applications (MCA), Tezpur University  
**Package / Version**: `com.offdp.app` • `v1.0.0` (Expo SDK 58 / React Native 0.88)

---

## 📱 Building & Running the Android APK

### Option 1: Standalone Android APK via EAS Cloud (Recommended)
[`eas.json`](eas.json) is configured with a `preview` profile that builds a directly installable `.apk`:
```bash
npx eas-cli build -p android --profile preview
```
Download and install the generated `.apk` on any Android device.

### Option 2: Local Android Build
With Android Studio / Android SDK configured locally:
```bash
npx expo run:android
```

### Option 3: Development Server (Expo Go)
1. Install **Expo Go** on [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://apps.apple.com/app/expo-go/id982107779).
2. Start the Metro bundler:
   ```bash
   npx expo start
   ```
   *(Use `npx expo start --tunnel` if your phone and PC are on different networks.)*

---

## 🏗️ Architecture & Offline-First Sync

- **Local Persistence**: Uses `@react-native-async-storage/async-storage` for instant, non-blocking offline reads/writes of census records, drafts, sync queue items, and cached user credentials.
- **Cloud Backend**: Integrates with **Supabase** (`@supabase/supabase-js`) for two-way synchronization of `field_records` and `app_users`.
- **Real-Time Network Detection**: Uses `@react-native-community/netinfo` to display a live **Online / Offline** status badge in the header and automatically sync pending records when connectivity is restored (plus a 15-second background sync interval while online).
- **Aadhaar De-duplication**: Normalizes and validates 12-digit Aadhaar UIDs locally before saving to prevent duplicate household submissions.

---

## 🔐 Role-Based Access & Default Credentials

- **Default Supervisor Account**:
  - **Username**: `narayan`
  - **Password**: `admin`
- **Field Worker Accounts**: Created and managed by a Supervisor in the **User Management** screen (automatically synced to Supabase and cached for offline login).

---

## 🎨 Implemented Screens & Features

| # | Screen | Role Access | Implemented Features |
|---|--------|-------------|----------------------|
| **1** | **Splash Screen** | All | Purple gradient (`#27124f` → `#542699`), OFFDP brand mark, *"Collect • Store Offline • Sync Later"* tagline, auto-advances (2.8s) or tap to continue. |
| **2** | **Login (Offline & Cloud Auth)** | All | Role selector (*Supervisor* / *Field Worker*), username & password sign-in, *Remember me*, role-mismatch handling, offline credential cache + Supabase `app_users` sync. |
| **3** | **Dashboard** | All (Role-Aware) | Pull-to-refresh, user/role header, live *Online / Offline* badge, and role-specific quick actions & metrics. |
| **4** | **Data Collection (Digital Census 2026)** | Field Worker | GPS coordinate capture (`expo-location`), photo capture/picker (`expo-image-picker`), full household census form (Head of Family, Aadhaar UID, Demographics, Housing, 8 Amenities, Occupation & Income), *Save Draft* & *Submit Survey*. |
| **5** | **My Field Records** | Field Worker | Filter tabs (*All*, *Drafts*, *Pending*, *Synced*), live search, pull-to-refresh, resume/delete drafts, and record detail modal. |
| **6** | **Synchronization & Queue** | Field Worker | Persistent offline delta queue, manual *Sync Now* with progress status, background sync & Wi-Fi-only toggles, last sync timestamp. |
| **7** | **Supervisor Review** | Supervisor | *Pending*, *Approved*, and *Rejected* tabs; household detail inspection; *Approve*, *Reject* (with reason), and inline *Edit Record* with supervisor notes. |
| **8** | **All Master Census Data** | Supervisor | Master view across all statuses (*All*, *Approved*, *Synced*, *Pending*, *Draft*), search bar, pull-to-refresh, detail modal, and supervisor editing. |
| **9** | **User Management** | Supervisor | Create, edit, and list Field Worker & Supervisor accounts with 2-way Supabase + offline cache sync. |

---

## 🧭 Navigation

Tap the **☰ (Hamburger Menu)** icon at the top-left of the Dashboard to open the sliding navigation drawer, switch between role-permitted screens, check live Supabase/SQLite sync status, or sign out.

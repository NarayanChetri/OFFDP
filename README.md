# OFFDP — Offline-First Field Data Platform

**Authors**: Reetik Sil, Narayan Chetri, Dipankar Das  
**Programme**: Master of Computer Applications (MCA), Tezpur University  
**Specification**: IEEE 830-style Software Requirements Specification (SRS) Version 1.0  

---

## 📱 How to Run & Test on Mobile

### Method 1: Instant Mobile Testing with Expo Go (Recommended — 1 Minute)

1. **Install Expo Go on your mobile phone**:
   - **Android**: Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Google Play Store.
   - **iOS**: Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from Apple App Store.

2. **Start the local server**:
   Open a terminal in `C:\Users\naray\Desktop\OFFDP` and run:
   ```bash
   npx expo start
   ```
   *(If your mobile phone and computer are on different networks or cellular data, run `npx expo start --tunnel`)*.

3. **Open the App**:
   - **On Android**: In Expo Go, tap **"Scan QR code"** and scan the QR code displayed in your terminal. You can also tap **"Enter URL manually"** and enter:
     ```
     exp://<YOUR_PC_IP>:8082
     ```
   - **On iOS**: Open the built-in Camera app, scan the terminal QR code, and tap the prompt.

---

### Method 2: Standalone Android APK Build

#### Build via EAS Cloud (No local Android Studio / NDK required):
```bash
npx eas-cli build -p android --profile preview
```
This produces a downloadable `.apk` file that installs directly on any Android device.

---

## 🎨 Implemented Screens & Features

| # | Screen Name | SRS Requirement | Implemented Features |
|---|-------------|-----------------|----------------------|
| **1** | **Splash Screen** | NFR-4.1 | Midnight purple gradient, mountain ridge silhouettes, hiker silhouette, brand logo, auto-transition to Login. |
| **2** | **Login (Offline Auth)** | FR-1.1, FR-1.3, FR-1.4 | Cached offline session, "Remember me (offline)", quick-switch between **Field Worker** and **Supervisor** (RBAC). |
| **3** | **Home / Dashboard** | NFR-4.1, FR-6.4 | 4 Action Cards (*New Entry*, *My Records*, *Sync*, *Sync Status*), **Offline/Online** pill toggle in header, rolling hills illustration. |
| **4** | **Data Collection** | FR-2.1, FR-2.4, FR-2.5, NFR-1.2 | GPS coordinate capture, dynamic fields (*Water Quality*, *Vegetation*, *Soil*), local photo picker with compression stats badge, *Save Draft* & *Save*. |
| **5** | **My Records (Local Data)** | FR-2.2, FR-2.3 | Filter tabs (*All (12)*, *Drafts (3)*, *Pending Sync (5)*, *Synced (4)*), live search bar, Tezpur field sample records. |
| **6** | **Synchronization** | FR-3.1, FR-3.2, FR-3.3, FR-6.1 | Persistent delta queue, *Sync Now* with live upload simulation, Background sync & Wi-Fi toggles, network status simulator. |
| **7** | **Conflict Resolution** | FR-4.2, FR-4.3, FR-4.5 | Version comparison (*My Changes (Device)* vs *Server Version* vs *Merge Manually*), LWW policy, resolution commit. |
| **8** | **Supervisor Review** | FR-5.1, FR-5.2, FR-5.3 | *Pending (3)* and *Resolved (12)* tabs, side-by-side version comparison modal, *Accept Worker*, *Accept Server*, or *Flag Error*. |

---

## ⚡ Instant Navigation & Evaluator Shortcuts

Tap the **`⊞` (Apps Menu)** icon at the top-right corner of any screen at any time to:
- Jump directly to any of the 8 specification screens.
- Toggle between **Field Worker** and **Supervisor** roles.
- Switch simulated connection between **Online** and **Offline**.
- Reset local SQLite/AsyncStorage to original seed data.


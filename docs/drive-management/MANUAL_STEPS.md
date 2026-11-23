# MANUAL_STEPS.md — Production Configuration & Deployment Guide

This guide details the one-time configuration steps required by the system administrator and mobile release engineer to activate Universal Links, Android App Links, and database publication in production.

---

## 1. Supabase Database Migration

Apply the additive migration `20261024_drive_management_forms.sql` to your Supabase project:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your project -> **SQL Editor**.
3. Copy the full contents of:
   ```
   ADMIN-PANEL-RIMT/supabase/migrations/20261024_drive_management_forms.sql
   ```
4. Click **Run**.
5. Verify that:
   - Tables created: `drives`, `drive_forms`, `notifications`, `drive_registrations`.
   - RPC functions created: `publish_drive`, `register_for_drive`, `is_admin`, `current_student_id`.
   - Publications: `drive_registrations` and `notifications` are added to `supabase_realtime`.

---

## 2. iOS Universal Links Configuration

1. **Obtain Apple Developer Identifiers:**
   - Locate your Apple Developer **Team ID** (e.g. `9JA89QQLNQ`).
   - Locate your iOS **Bundle Identifier** in `APP-RIMT-BCA/app.json` (e.g. `com.rimt.studentapp`).
2. **Update Apple App Site Association:**
   - Edit `ADMIN-PANEL-RIMT/public/.well-known/apple-app-site-association`.
   - Replace `<TEAM_ID>.<BUNDLE_ID>` with your real App ID:
     ```json
     {
       "applinks": {
         "apps": [],
         "details": [
           {
             "appID": "9JA89QQLNQ.com.rimt.studentapp",
             "paths": ["/drives/*"]
           }
         ]
       }
     }
     ```
3. **Configure Associated Domains in Expo:**
   - In `APP-RIMT-BCA/app.json`, add your web domain under `ios.associatedDomains`:
     ```json
     {
       "expo": {
         "ios": {
           "associatedDomains": ["applinks:portal.rimt.ac.in"]
         }
       }
     }
     ```

---

## 3. Android App Links Configuration

1. **Obtain Android Keystore SHA-256 Fingerprint:**
   - Run in your terminal or check Google Play Console:
     ```bash
     keytool -list -v -keystore your_release_keystore.jks
     ```
   - Copy the SHA-256 fingerprint string (format: `14:6D:E9:...`).
2. **Update Asset Links:**
   - Edit `ADMIN-PANEL-RIMT/public/.well-known/assetlinks.json`.
   - Replace `<PACKAGE_NAME>` and `<SHA256_FINGERPRINT_PLACEHOLDER>`:
     ```json
     [
       {
         "relation": ["delegate_permission/common.handle_all_urls"],
         "target": {
           "namespace": "android_app",
           "package_name": "com.rimt.bca.student",
           "sha256_cert_fingerprints": [
             "14:6D:E9:E8:AB:F1:C5:4F:09:4B:32:42:9F:AE:84:4E:97:5B:DF:CC:A6:CE:E1:A3:84:22:94:50:2A:65:43:3D"
           ]
         }
       }
     ]
     ```
3. **Configure Intent Filters in Expo:**
   - In `APP-RIMT-BCA/app.json`, add:
     ```json
     {
       "expo": {
         "android": {
           "intentFilters": [
             {
               "action": "VIEW",
               "autoVerify": true,
               "data": [
                 {
                   "scheme": "https",
                   "host": "portal.rimt.ac.in",
                   "pathPrefix": "/drives"
                 }
               ],
               "category": ["BROWSABLE", "DEFAULT"]
             }
           ]
         }
       }
     }
     ```

---

## 4. Rebuilding & Deploying Mobile Apps

After configuring associated domains and intent filters:
1. Rebuild the Android binary:
   ```bash
   eas build --platform android --profile production
   ```
2. Rebuild the iOS binary:
   ```bash
   eas build --platform ios --profile production
   ```
3. Distribute via Google Play Internal Testing / TestFlight for validation.

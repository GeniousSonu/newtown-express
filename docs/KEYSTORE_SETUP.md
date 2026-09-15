# Android TWA Keystore & Build Documentation

This document explains where the Android signing keystore is kept, how Digital Asset Links are configured, and the release versioning workflow.

---

## 1. Keystore Security & Storage Location

Under **no circumstances** should the Android keystore (`*.keystore`, `*.jks`) or its passwords be committed to version control. They are strictly excluded in `.gitignore`.

### Keystore Coordinates
- **File Location**: `~/.android/newtown-express.keystore` (user home directory, external to the project repo)
- **Key Alias**: `newtown`
- **Algorithm**: RSA 2048-bit, 10,000-day validity
- **Certificate SHA-256 Fingerprint**:
  `AF:62:83:94:30:D2:16:20:C5:B1:95:12:97:EB:38:01:47:B3:F2:1E:F7:E4:CC:09:94:47:A7:BC:1B:42:5C:57`
- **Application Package**: `in.ibarts.newtownexpress`
- **Credentials Reference**: Stored locally in `~/.android/keystore-credentials.txt` (chmod 600, outside repo).

---

## 2. Digital Asset Links (`assetlinks.json`)

To enable Android to verify domain ownership and launch the TWA with **no address bar** (standalone window), the certificate fingerprint must match `public/.well-known/assetlinks.json` on the production domain.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "in.ibarts.newtownexpress",
      "sha256_cert_fingerprints": [
        "AF:62:83:94:30:D2:16:20:C5:B1:95:12:97:EB:38:01:47:B3:F2:1E:F7:E4:CC:09:94:47:A7:BC:1B:42:5C:57"
      ]
    }
  }
]
```

---

## 3. Versioning Convention (`version.json`)

Android package manager strictly requires `versionCode` to be an increasing integer for new APK builds to install over existing installations.

The version is tracked in `version.json` in the project root:
```json
{
  "versionCode": 1,
  "versionName": "1.0.0",
  "lastBuiltAt": "2026-09-15T18:00:00.000Z"
}
```

### Rebuild Rules
1. Before every production APK build, increment `versionCode` by 1.
2. Update `versionName` (e.g. `1.0.1`, `1.1.0`).
3. Run `npm run build:apk` (or execute the TWA build script).
4. The script uploads the new APK to Firebase Storage and syncs the Firestore config document (`appConfig/androidApp`).
5. Existing users downloading from `/get-app` will get the update installed seamlessly on top of their current installation without needing to uninstall.

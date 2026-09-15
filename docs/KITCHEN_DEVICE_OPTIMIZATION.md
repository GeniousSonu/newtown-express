# Kitchen Alarm Device — Battery Optimization & Autostart Guide

> [!IMPORTANT]
> **Operational Setup Notice**: This is a mandatory one-time manual setup for the physical Android phone or tablet used as the Kitchen Manager's always-on alarm station.
> 
> Modern Android skins (especially Xiaomi/MIUI, Oppo/ColorOS, Vivo/Funtouch, and Realme) employ aggressive battery-saving daemons that will silently pause background network sockets (Firebase Firestore WebChannels) and suspend the Web Audio API context within 3–5 minutes of the screen turning off or another app opening.
>
> Follow the steps below for your phone's specific brand to guarantee the loud order chime rings 100% of the time.

---

## 1. Universal Checklist (All Brands)

1. **Keep Phone Plugged In**: Ensure the kitchen station device is connected to power during pantry hours.
2. **Screen Timeout**: Set **Settings → Display → Screen Timeout** to **10 minutes** or **Never (while charging)** in Developer Options (*"Stay awake"*).
3. **Volume**: Confirm **Media Volume** and **Ring Volume** are at 100%, and Do Not Disturb is OFF.

---

## 2. Brand-Specific Configuration

### A. Xiaomi / Redmi / POCO (MIUI & HyperOS)
1. **Autostart Permission**:
   - Open **Settings → Apps → Manage Apps → Newtown Express** (or Newtown Kitchen).
   - Turn ON **Autostart** (tap OK on the prompt).
2. **Battery Saver Exemption**:
   - In the same app info menu, scroll down to **Battery Saver**.
   - Change from *Battery saver (recommended)* to **No restrictions**.
3. **Lock App in Memory**:
   - Open Newtown Kitchen in the browser or installed app.
   - Swipe up and hold to enter **Recent Apps (Task Switcher)**.
   - Press and hold the Newtown Express app card until menu icons appear.
   - Tap the **Lock icon (🔒)** so a small padlock appears on the card. This prevents MIUI cleaner from killing the app.

---

### B. OPPO & Realme (ColorOS & Realme UI)
1. **Auto-Launch Permission**:
   - Open **Settings → Apps → App management → Newtown Express**.
   - Tap **Battery usage**.
   - Turn ON **Allow background activity**.
   - Turn ON **Allow auto-launch** and **Allow secondary launch**.
2. **Battery Optimization**:
   - Go to **Settings → Battery → More settings → Optimize battery use**.
   - Find Newtown Express and select **Don't optimize**.
3. **Lock in Recent Tasks**:
   - Open Newtown Express, open Recent Apps, tap the three dots (`⋮`) on top of the card, and tap **Lock**.

---

### C. Vivo & iQOO (Funtouch OS & OriginOS)
1. **High Background Power Consumption**:
   - Open **Settings → Battery → Background power consumption management** (or *High background power consumption*).
   - Locate Newtown Express and select **Allow high background power usage**.
2. **Autostart**:
   - Open **Settings → Applications & Permissions → Permission management → Autostart**.
   - Toggle ON Newtown Express.
3. **Lock in Memory**:
   - Enter Recent Apps view, swipe down on the Newtown Express card, and tap the **Lock icon**.

---

### D. Samsung (One UI)
1. **Battery Unrestricted**:
   - Open **Settings → Apps → Newtown Express → Battery**.
   - Select **Unrestricted** (instead of *Optimized*).
2. **Never Sleeping Apps**:
   - Open **Settings → Battery and device care → Battery → Background usage limits**.
   - Tap **Never sleeping apps**, tap `+`, and add Newtown Express.
3. **Keep Open**:
   - Open Recent Apps, tap the app icon above the card, and select **Keep open**.

---

### E. Stock Android / Google Pixel / Motorola
1. **App Battery Usage**:
   - Long-press the Newtown Express app icon → tap the **Info (i)** icon.
   - Tap **App battery usage** (or *Battery*).
   - Select **Unrestricted**.

---

## 3. Verification Test Protocol

Before declaring the kitchen station ready for shifts:

1. Open Newtown Express and log in with kitchen manager credentials (`kitchen@ibarts.in`).
2. Tap **Test Sound** in the top navigation bar to verify the siren rings clearly.
3. Lock the phone screen (screen turned off).
4. From another device (or desk), place a test order.
5. **Confirm**: The loud siren must loop continuously until kitchen staff acknowledges or actions the order.
6. Unlock the phone, reject or clear the test order.

# Command Queue Drag&Drop Debug Session
**Dátum:** 2023-12-23  
**Státusz:** ⚠️ RÉSZLEGESEN MEGOLDVA - További munka szükséges

---

## 🎯 Eredeti Kérés

A Unit Panel Command Queue-ban a waypoint elemek (MOVE TO) drag&drop átrendezése:
1. DOM elemek vizuális átrendezése húzással
2. Átrendezés után a unit útvonalának frissítése
3. Target = Next(Last) szabály alkalmazása az új sorrendben

---

## 🔍 Felfedezett Problémák

### 1. updatePanelContent() nem futott
- **Ok:** `split-screen` class ellenőrzés blokkolta
- **Megoldás:** Feltétel eltávolítása `selectUnit()`-ból

### 2. updatePanelContent() sokszor futott
- **Bizonyíték:** Alert sokszor megjelent
- **Következmény:** DOM folyamatosan felülíródik, listener-ek elvesznek

### 3. Console.log nem látszott
- **Ok:** Performance Mode blokkolja a log-okat
- **Üzenet:** `[Performance Mode] ENABLED - Logs disabled`

### 4. Drag irány hibás volt
- **Probléma:** `midY/clientY` használata vízszintes layout-nál
- **Megoldás:** `midX/clientX`-re cserélve

### 5. Drop event nem tüzelt
- **Megoldás:** `dragend` event használata `drop` helyett
- **Eredmény:** Alert FELVILLANT = dragend TŰZ ✅

### 6. dragInitialized flag
- **Probléma:** DOM rebuild után az új lista elemekre nem csatolódnak listener-ek mert a flag blokkolja
- **Státusz:** 🔴 NINCS MEGOLDVA

---

## ✅ Működő Változtatások

```javascript
// Game.js - updatePanelContent()
// data-waypoint-id hozzáadva stabil ID-hez
<div class="command-item" draggable="true" data-index="${index}" data-waypoint-id="${waypointId}">

// Vízszintes drag összehasonlítás
const midX = rect.left + rect.width / 2;
if (e.clientX < midX) { ... }

// dragend használata drop helyett
item.addEventListener('dragend', () => {
    // orderChanged ellenőrzés
    if (orderChanged) {
        this.reorderWaypointsFromDOM();
    }
});
```

---

## 🔴 Megoldatlan Problémák

1. **dragInitialized flag blokkolja újracsatolást**
   - updatePanelContent újraépíti a DOM-ot
   - Az új elemeknek nincsenek listener-ek
   - A flag blokkolja a setupCommandQueueDragListeners() újrafutását

2. **reorderWaypointsFromDOM() alert nem jelent meg**
   - A dragend tüzel (alert felvillant korábban)
   - De a orderChanged ellenőrzés után nincs reorder alert
   - Lehetséges ok: az összehasonlítás hibás, vagy a DOM már visszaállt

---

## 📋 Következő Lépések

1. **dragInitialized flag eltávolítása**
2. **Event delegation használata** a lista konténeren (nem az egyes elemeken)
3. **Vagy:** updatePanelContent NE hívódjon meg reorder után azonnal

---

## 📁 Érintett Fájlok

| Fájl | Módosítás |
|------|-----------|
| `src/Core/Game.js` | updatePanelContent, setupCommandQueueDragListeners, reorderWaypointsFromDOM |
| `src/Core/Game.js` | selectUnit() - split-screen feltétel eltávolítva |

---

## 🔗 Kapcsolódó Dokumentáció

A korábbi session dokumentációja (elveszett_marokkoban_Refine Path Debug Markers.md) említi:
- `pathSegmentIndices` - dense vs sparse path kezelés
- `targetWaypointId`, `lastWaypointId` - ID-alapú waypoint követés
- `updateWaypointCurve()` - Target = Next(Last) logika (ez MEGVAN és működik)

# Asterobia Agentic Workflow Visualization

Ez a dokumentum vizualizálja az Asterobia projekt fejlesztési folyamatát (Protocol v1), ahogyan azt a `docs/` mappa fájljai (`START_HERE.md`, `NOTES_*.md`, `PLANNING_PROTOCOL.md`) meghatározzák.

## Workflow Infographic (Mermaid)

```mermaid
graph TD
    %% --- Szereplők (Nodes) ---
    User("👤 Ádám (User)<br/>[Döntéshozó / Manual Tester]")
    ChatGPT("🧠 ChatGPT<br/>[Spec Guardian / Prompt Writer]")
    Claude("⚡ Claude Code<br/>[Implementator]")
    Antigravity("🛡️ Antigravity (Gemini)<br/>[Auditor / Merge Master]")
    
    %% --- Adattárolók (Stores) ---
    LocalRepo[("📂 Local Repo<br/>(D:/.../AI_GAME)")]
    RemoteGitHub[("☁️ GitHub Origin<br/>(asterobia-quality-docs)")]
    
    %% --- Dokumentumok (Docs) ---
    DocNotes("📝 Agent Notes<br/>(NOTES_*.md)")
    DocStatus("📊 Status Tracker<br/>(STATUS_WALKTHROUGH.md)")
    DocBuglist("🐞 Buglist<br/>(BUGLIST.md)")
    DocSnapshot("📸 Handoff Snapshot")

    %% --- Folyamat (Egyszerűsített) ---
    
    %% 1. Tervezés
    User -- "1. Indítás / Kérdés" --> ChatGPT
    ChatGPT -- "Olvasás (Context)" --> DocStatus
    ChatGPT -- "Olvasás (Rules)" --> DocNotes
    ChatGPT -- "2. Terv & Prompt Generálás" --> User
    
    %% 2. Implementáció
    User -- "3. Feladat kiosztás (Prompt)" --> Claude
    Claude -- "4. Kódolás (src/)" --> LocalRepo
    Claude -- "5. Push Branch (work/*)" --> RemoteGitHub
    
    %% 3. Tesztelés
    User -- "6. HU Test (Human Usable)" --> LocalRepo
    User -- "Test Result (PASS/FAIL)" --> Antigravity
    
    %% 4. Audit & Merge
    User -- "7. Merge Request" --> Antigravity
    Antigravity -- "8. Audit (Determinism/Safety)" --> LocalRepo
    Antigravity -- "9. Merge (work/* -> main)" --> LocalRepo
    Antigravity -- "10. Push (main)" --> RemoteGitHub
    
    %% 5. Adminisztráció & Szinkron
    Antigravity -- "11. Update Status" --> DocStatus
    Antigravity -- "12. Triage / Log Fix" --> DocBuglist
    Antigravity -- "13. Create Snapshot" --> DocSnapshot
    
    %% Kapcsolatok
    subgraph Docs_Brain ["📚 Documentation Brain"]
        DocStatus
        DocNotes
        DocBuglist
        DocSnapshot
    end
    
    %% Stílusok
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style ChatGPT fill:#cfc,stroke:#333,stroke-width:2px
    style Claude fill:#ccf,stroke:#333,stroke-width:2px
    style Antigravity fill:#fcc,stroke:#333,stroke-width:2px
    style RemoteGitHub fill:#ccc,stroke:#333,stroke-width:2px
```

## Részletes Szerepkörök

### 1. 👤 Ádám (User)
*   **Felelősség:** A folyamat motorja. Ő másolja a promptokat az ágensek között.
*   **Kizárólagos jog:** Döntéshozatal (Merge engedélyezése, Feature scope).
*   **Git:** **NEM** végez Git műveleteket (commit/push), ezt az ágensekre delegálja.
*   **Gates:** "HU Test Gate" - kötelező manuális tesztelés (pl. játék indítása) minden UI/Boot érintő változásnál.

### 2. 🧠 ChatGPT (Spec Guardian)
*   **Bemenet:** `HANDOFF_SNAPSHOT`, `STATUS_WALKTHROUGH`, `NOTES_CHATGPT`.
*   **Kimenet:** Részletes, kontextus-helyes **Promptok** a Claude Code vagy az Antigravity számára.
*   **Fókusz:** Nem kódol, hanem tervez. Őrzi a specifikációt (`start_here.md`).

### 3. ⚡ Claude Code (Implementation)
*   **Fókusz:** "Deep Coding". Bonyolult algoritmusok, refaktorálás.
*   **Szabály:** Soha nem pushol `main`-re közvetlenül. Mindig `work/...` branch-en dolgozik.
*   **Output:** Kód (`src/`) + Tesztek.

### 4. 🛡️ Antigravity (Auditor & Merge Master)
*   **Fókusz:** Minőségbiztosítás, Dokumentáció szinkron, Biztonság.
*   **Audit:** Ellenőrzi a Claude által írt kódot (Determinism check, Style check) merge előtt.
*   **Admin:** Frissíti a `STATUS_WALKTHROUGH.md`-t, `BUGLIST.md`-t és kezeli a verziókövetést.
*   **Handoff:** Elkészíti a Snapshot-ot a következő munkamenethez.

## Adatfolyam (Data Flow)

1.  **Code Flow:** `Claude (work/*)` -> `Ádám (Test)` -> `Antigravity (main)` -> `GitHub`.
2.  **Doc Flow:** `Antigravity` -> `Docs/*.md` -> `ChatGPT (Context)`.
```

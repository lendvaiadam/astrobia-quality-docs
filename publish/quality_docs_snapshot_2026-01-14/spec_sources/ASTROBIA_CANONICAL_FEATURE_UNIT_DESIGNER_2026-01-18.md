# CANONICAL FEATURE SPEC: UNIT DESIGNER & PRODUCTION (Binding)

**ID:** ASTROBIA_CANONICAL_FEATURE_UNIT_DESIGNER_2026-01-18
**Status:** DRAFT (Binding for Implementation)
**Date:** 2026-01-18

---

## 1. Unit Designer Workflow

The Unit Designer allows the Player to create and refine Unit Types (Blueprints).

### 1.1. Capacity & Feature Distribution
- **Base Capacity**: Every new Type starts with **100%** Capacity.
- **Distribution**: The 100% must be distributed among features (e.g., Speed, Armor, Mining).
- **Minimum Constraint**: A feature must have at least **20%** allocated to be active.
- **Overclocking**:
  - The Player can pay **Resources** to increase the Total Capacity above 100%.
  - Increases are purchased in **10% steps**.
  - Example: Buying +20% results in 120% Total Capacity.

### 1.2. Naming Convention (Strict)
- **Format**: 6 Letters + 2 Digits.
- **Letter Pattern**: `C-V-C-C-V-C` (Consonant-Vowel-Consonant-Consonant-Vowel-Consonant).
  - Example: `MORDIG`, `BANTER`, `ZOLTAC`.
  - Letters are randomly generated. No other constraints.
- **Version Number**:
  - The 2 digits represent **Total Capacity / 10**.
  - Example: 100% Capacity -> `10`. Name: `MORDIG10`.
  - Example: 120% Capacity -> `12`. Name: `MORDIG12`.

### 1.3. Visual Generation Process (AI integration)
1.  **Trigger**: When Type creation starts.
2.  **AI Prompting**: The System uses an AI Agent to generate prompts based on the distributed parameters.
3.  **Image Generation**:
    - Tool: **Nano Banana Pro** (or current image gen integration).
    - Output: **4 distinct images** (can be a grid/split image).
4.  **User Selection**: The Designer UI presents the 4 images. User selects **ONE**.
5.  **3D Generation**:
    - Tool: **MS Trellis 2** (Image-to-3D).
    - Input: The Selected Image.
    - Output: `.glb` model file.
6.  **Binding**: The `.glb` is permanently assigned to this Unit Type.

---

## 2. Refinement & Upgrading

The Player can return to the Designer to upgrade an existing Type.

- **Process**: Pay Resources for more Capacity %.
- **Constraint**: Must add in **10% increments**.
- **Result**:
  - `MORDIG10` (+20% paid) -> becomes `MORDIG12`.
  - The Features can be boosted using the new points, or new Features added.
  - Existing Units of the old version (`MORDIG10`) remain as-is until **Production Upgrade**.

---

## 3. Production & Manufacturing

### 3.1. Manufacturing (Size / Upscaling)
- **Standard Size**: All Units are manufactured at **Size 1** by default.
- **Size 1** = 100% Physical Size & Stat Scale.
- **Upscaling**:
  - The Player can increase the Manufacturing Size (Upscale) for a specific Unit batch or individual Unit.
  - **Scale Factor**: Linear 100% increments.
  - **Range**: Size **1** to **9**.
  - **Logic**:
    - Size 1: 100% (Base)
    - Size 2: 200% (+100% added)
    - Size 3: 300% (+200% added)
  - **Effect**: The Unit is physically larger and all variable parameters (HP, Cargo, Damage?) are multiplied by the Size factor.

### 3.2. Instance Naming
- A specific Unit Instance is identified by: `[TYPE_NAME][VERSION]-[SIZE]`
- Example: `MORDIG12-1` (Type MORDIG, Ver 120% Cap, Size 1).
- Example: `MORDIG12-3` (Type MORDIG, Ver 120% Cap, Size 3 / Upscaled).

### 3.3. Retrofit / Upgrade
- Units already in the field (e.g., `MORDIG10-1`) can be brought to a Production facility.
- They can be upgraded to the latest known Version of their Type (e.g., to `MORDIG12`).
- They can also be Upscaled (Size increase) if the facility allows.

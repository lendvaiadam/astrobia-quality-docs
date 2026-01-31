---
name: asterobia-ui-webcomponents
description: Guide for building Frontend UI using Web Components and modern design patterns.
---

# Asterobia UI & Web Components Skill

## When to use
- When asked to build HUD elements, Panels, or Menus.
- When creating "Custom Elements" or "Web Components".
- When styling UI (Glassmorphism, Cyberpunk aesthetics).

## Design Principles
Use **Rich Aesthetics** and **Premium Feel**:
-   **Vibrant Colors**: HSL tailored palettes, neon accents (Cyan/Orange/Purple).
-   **Glassmorphism**: Backdrop blur (`backdrop-filter: blur(10px)`), semi-transparent backgrounds.
-   **Micro-animations**: Smooth transitions on hover, click, and appear.
-   **Typography**: Clean, modern fonts (Inter, Roboto, Orbitron for headers).

## Technical Implementation
Use vanilla **Web Components** (Custom Elements v1) or lightweight libraries (lit-html) if permitted. 
Do **NOT** introduce heavy frameworks (React/Vue) unless explicitly requested.

### Template (Vanilla JS)
```javascript
class AsterobiaPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: 'Orbitron', sans-serif;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 8px;
                color: #fff;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            }
            /* Add premium styles here */
        </style>
        <div class="content">
            <slot></slot>
        </div>
        `;
    }
}
customElements.define('asterobia-panel', AsterobiaPanel);
```

### Shadow DOM
- Use Shadow DOM to encapsulate styles (prevent leakage).
- Use CSS Variables for theming (e.g. `--primary-color`).

### State Management
- For complex data, pass data via properties/attributes.
- Emit Custom Events (`new CustomEvent('action', { bubbles: true, composed: true })`) for interactions.

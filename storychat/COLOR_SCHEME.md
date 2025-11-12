# Site-Wide Color Scheme

**Based on**: Here Pin Logo Colors
**Date**: 2025-10-08

---

## 🎨 Logo Colors (Source)

From `here_pin_logo.svg`:
- **Pin Symbol**: `#008080` (Teal)
- **Text "HERE"**: `#1a2f3a` (Dark Navy-Teal)
- **Pin Gradient**: `#2a4f5f` → `#1a2f3a` (Medium to Dark Teal)

---

## 🌈 Primary Brand Colors

### Teal (Primary Brand Color)
```css
/* Based on logo pin symbol #008080 */
--brand-50:  #e6f7f7;   /* Lightest teal tint */
--brand-100: #b3ebeb;   /* Light teal */
--brand-200: #80dfdf;   /* Soft teal */
--brand-300: #4dd3d3;   /* Medium teal */
--brand-400: #1ac7c7;   /* Vibrant teal */
--brand-500: #008080;   /* PRIMARY - Logo teal */
--brand-600: #006666;   /* Darker teal */
--brand-700: #004d4d;   /* Deep teal */
--brand-800: #003333;   /* Very dark teal */
--brand-900: #001a1a;   /* Darkest teal */
```

### Navy (Secondary Brand Color)
```css
/* Based on logo text #1a2f3a */
--navy-50:  #e8ebec;   /* Lightest navy tint */
--navy-100: #c5cdd1;   /* Light navy */
--navy-200: #9eabb2;   /* Soft navy */
--navy-300: #778993;   /* Medium navy */
--navy-400: #59707b;   /* Muted navy */
--navy-500: #3c5663;   /* Saturated navy */
--navy-600: #344e5b;   /* Mid navy */
--navy-700: #2a4351;   /* Deep navy */
--navy-800: #223947;   /* Darker navy */
--navy-900: #1a2f3a;   /* SECONDARY - Logo navy */
```

---

## 🎯 Functional Colors

### Success (Green)
```css
--success-50:  #ecfdf5;
--success-100: #d1fae5;
--success-500: #10b981;  /* Primary success */
--success-600: #059669;
--success-700: #047857;
```

### Warning (Amber)
```css
--warning-50:  #fffbeb;
--warning-100: #fef3c7;
--warning-500: #f59e0b;  /* Primary warning */
--warning-600: #d97706;
--warning-700: #b45309;
```

### Error (Red)
```css
--error-50:  #fef2f2;
--error-100: #fee2e2;
--error-500: #ef4444;  /* Primary error */
--error-600: #dc2626;
--error-700: #b91c1c;
```

### Info (Blue)
```css
--info-50:  #eff6ff;
--info-100: #dbeafe;
--info-500: #3b82f6;  /* Primary info */
--info-600: #2563eb;
--info-700: #1d4ed8;
```

---

## 🖌️ UI Neutrals

### Slate (Primary Neutral)
```css
--slate-50:  #f8fafc;   /* Backgrounds */
--slate-100: #f1f5f9;   /* Hover states */
--slate-200: #e2e8f0;   /* Borders */
--slate-300: #cbd5e1;   /* Disabled states */
--slate-400: #94a3b8;   /* Placeholders */
--slate-500: #64748b;   /* Secondary text */
--slate-600: #475569;   /* Primary text light */
--slate-700: #334155;   /* Primary text */
--slate-800: #1e293b;   /* Headings */
--slate-900: #0f172a;   /* Strong emphasis */
```

---

## 🎨 Gradient Combinations

### Brand Gradients
```css
/* Primary Brand Gradient (Teal to Navy) */
.gradient-brand {
  background: linear-gradient(135deg, #008080 0%, #1a2f3a 100%);
}

/* Light Brand Gradient */
.gradient-brand-light {
  background: linear-gradient(135deg, #4dd3d3 0%, #3c5663 100%);
}

/* Vibrant Brand Gradient */
.gradient-brand-vibrant {
  background: linear-gradient(135deg, #1ac7c7 0%, #2a4351 100%);
}

/* Subtle Background Gradient */
.gradient-bg {
  background: linear-gradient(135deg, #e6f7f7 0%, #e8ebec 50%, #f8fafc 100%);
}
```

### Accent Gradients (for CTAs, highlights)
```css
/* Teal to Cyan */
.gradient-accent-cool {
  background: linear-gradient(135deg, #008080 0%, #06b6d4 100%);
}

/* Navy to Blue */
.gradient-accent-info {
  background: linear-gradient(135deg, #1a2f3a 0%, #3b82f6 100%);
}

/* Success Gradient */
.gradient-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
```

---

## 📐 Component Color Mappings

### Buttons

**Primary (Brand)**
```css
/* Use Brand Teal */
background: #008080;
hover: #006666;
active: #004d4d;
text: #ffffff;
```

**Secondary (Navy)**
```css
/* Use Navy */
background: #1a2f3a;
hover: #2a4351;
active: #344e5b;
text: #ffffff;
```

**Accent (Gradient)**
```css
/* Use Brand Gradient */
background: linear-gradient(135deg, #008080 0%, #1a2f3a 100%);
hover: linear-gradient(135deg, #1ac7c7 0%, #2a4351 100%);
text: #ffffff;
shadow: 0 4px 12px rgba(0, 128, 128, 0.3);
```

**Outline**
```css
border: 2px solid #008080;
background: transparent;
text: #008080;
hover-bg: #e6f7f7;
```

### Cards

**Default**
```css
background: #ffffff;
border: 1px solid #e2e8f0;
shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

**Hover**
```css
border: 1px solid #80dfdf;  /* Brand-200 */
shadow: 0 4px 12px rgba(0, 128, 128, 0.15);
```

**Active/Selected**
```css
background: #e6f7f7;  /* Brand-50 */
border: 2px solid #008080;
```

### Badges

**Status Badges**
```css
/* Active/Healthy */
background: #d1fae5;  /* Success-100 */
text: #047857;        /* Success-700 */

/* Growing/In Progress */
background: #b3ebeb;  /* Brand-100 */
text: #004d4d;        /* Brand-700 */

/* Cooling/Stale */
background: #fef3c7;  /* Warning-100 */
text: #b45309;        /* Warning-700 */

/* Archived */
background: #f1f5f9;  /* Slate-100 */
text: #475569;        /* Slate-600 */
```

### Inputs

**Default**
```css
background: #ffffff;
border: 2px solid #cbd5e1;  /* Slate-300 */
text: #1e293b;              /* Slate-800 */
placeholder: #94a3b8;       /* Slate-400 */
```

**Focus**
```css
border: 2px solid #008080;  /* Brand-500 */
ring: 0 0 0 3px rgba(0, 128, 128, 0.1);
outline: none;
```

**Error**
```css
border: 2px solid #ef4444;  /* Error-500 */
ring: 0 0 0 3px rgba(239, 68, 68, 0.1);
```

### Links

**Default**
```css
color: #008080;       /* Brand-500 */
hover: #004d4d;       /* Brand-700 */
underline: #4dd3d3;   /* Brand-300 */
```

**In Dark Backgrounds**
```css
color: #4dd3d3;       /* Brand-300 */
hover: #80dfdf;       /* Brand-200 */
```

---

## 🌓 Dark Mode (Future)

### Dark Mode Colors
```css
/* Backgrounds */
--dark-bg-primary: #0f172a;    /* Slate-900 */
--dark-bg-secondary: #1e293b;  /* Slate-800 */
--dark-bg-tertiary: #334155;   /* Slate-700 */

/* Text */
--dark-text-primary: #f8fafc;   /* Slate-50 */
--dark-text-secondary: #cbd5e1; /* Slate-300 */
--dark-text-tertiary: #94a3b8;  /* Slate-400 */

/* Brand Colors (Adjusted for Dark Mode) */
--dark-brand-primary: #4dd3d3;   /* Brand-300 - Lighter for contrast */
--dark-brand-secondary: #80dfdf; /* Brand-200 - Even lighter */
```

---

## 📱 Application Map

### Current Usage → New Brand Colors

**Gradients** (Blue/Purple → Teal/Navy)
```css
/* OLD */
from-blue-600 to-purple-600

/* NEW */
from-[#008080] to-[#1a2f3a]  /* Teal to Navy */
```

**Buttons** (Blue → Teal)
```css
/* OLD */
bg-blue-600 hover:bg-blue-700

/* NEW */
bg-[#008080] hover:bg-[#006666]
```

**Borders** (Blue → Teal)
```css
/* OLD */
border-blue-300

/* NEW */
border-[#80dfdf]
```

**Backgrounds** (Blue/Purple → Teal)
```css
/* OLD */
from-blue-50 via-white to-purple-50

/* NEW */
from-[#e6f7f7] via-white to-[#e8ebec]
```

---

## 🎨 Tailwind Config Extension

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand Colors (from logo)
        brand: {
          50: '#e6f7f7',
          100: '#b3ebeb',
          200: '#80dfdf',
          300: '#4dd3d3',
          400: '#1ac7c7',
          500: '#008080',  // PRIMARY
          600: '#006666',
          700: '#004d4d',
          800: '#003333',
          900: '#001a1a',
        },
        navy: {
          50: '#e8ebec',
          100: '#c5cdd1',
          200: '#9eabb2',
          300: '#778993',
          400: '#59707b',
          500: '#3c5663',
          600: '#344e5b',
          700: '#2a4351',
          800: '#223947',
          900: '#1a2f3a',  // SECONDARY
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #008080 0%, #1a2f3a 100%)',
        'gradient-brand-light': 'linear-gradient(135deg, #4dd3d3 0%, #3c5663 100%)',
        'gradient-bg': 'linear-gradient(135deg, #e6f7f7 0%, #e8ebec 50%, #f8fafc 100%)',
      }
    }
  }
}
```

---

## ✅ Action Items

### Immediate Changes
1. Update all `blue-X` classes → `brand-X`
2. Update all `purple-X` classes → `navy-X`
3. Update gradient backgrounds → brand gradients
4. Update button colors → brand colors
5. Update focus rings → brand colors

### Component Updates Needed
- [ ] SimplifiedHome.tsx - gradients and buttons
- [ ] Header.tsx - notification badge
- [ ] SubmissionInput.tsx - focus states
- [ ] SubmissionResult.tsx - status colors
- [ ] StoryMatchCard.tsx - badges
- [ ] StoryChatSidebar.tsx - gradients
- [ ] StoryPage.tsx - accent colors
- [ ] LiveSignals.tsx - category badges

---

## 🎯 Brand Guidelines

### Do's ✅
- Use `brand-500` (#008080) for primary CTAs
- Use `navy-900` (#1a2f3a) for text and headings
- Use gradient-brand for hero elements
- Maintain teal as the dominant color
- Use navy for depth and contrast

### Don'ts ❌
- Don't mix old blue/purple with new teal/navy
- Don't use pure black (#000000) except for text
- Don't use brand colors for error states (use red)
- Don't overuse gradients (reserve for CTAs and heroes)

---

**Next Steps**: Apply this color scheme systematically across all components using Tailwind's custom colors!

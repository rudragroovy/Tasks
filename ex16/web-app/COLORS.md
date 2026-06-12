# Production-Grade Color System & Visual Identity Specification

## Overview

This document defines the complete color palette, visual language, and design principles for a premium information platform powered by a continuously updated data pipeline.

The platform should evoke feelings of:

* Trust
* Intelligence
* Discovery
* Nature
* Professionalism
* Editorial Quality
* Timelessness

The visual style should combine the elegance of Apple, the clarity of Notion, the precision of Stripe, the storytelling of National Geographic, and the minimalism of Linear.

---

# Design Philosophy

The interface should never feel noisy or overly colorful.

Instead, it should use a restrained palette where colors communicate meaning rather than decoration.

Follow the **60-30-10 Rule**:

* **60% Neutral backgrounds**
* **30% Brand colors**
* **10% Accent colors**

This creates a calm and highly readable interface suitable for browsing large amounts of information.

---

# Primary Brand Colors

## Primary

Deep Forest Green

```css
Primary: #1B5E4A
Hover: #164C3C
Light: #2F7A63
```

Represents:

* Knowledge
* Nature
* Reliability
* Stability
* Trust

Use for:

* Primary buttons
* Active navigation
* Selected filters
* Primary actions
* Links
* Important highlights

---

## Secondary

Ocean Teal

```css
Secondary: #0F766E
Hover: #115E59
Light: #2AA198
```

Represents:

* Freshness
* Modern technology
* Data visualization
* Exploration

Use for:

* Secondary buttons
* Charts
* Tags
* Interactive components
* Cards
* Search highlights

---

## Accent

Warm Gold

```css
Accent: #D4A017
Hover: #B8860B
Light: #E6B93D
```

Represents:

* Premium quality
* Featured content
* Discovery
* Verification

Use sparingly for:

* Featured collections
* Verified badges
* Premium indicators
* Important statistics
* Awards
* Highlights

---

# Neutral Color System

## Background

```css
Background: #F8FAF8
Surface: #FFFFFF
Secondary Surface: #F1F5F2
Elevated Surface: #FCFDFC
```

The interface should feel open and breathable.

Never use pure gray backgrounds.

---

## Text Colors

```css
Primary Text: #1A1A1A
Secondary Text: #4B5563
Muted Text: #6B7280
Placeholder: #9CA3AF
Disabled: #B8BCC4
```

Prioritize readability over stylistic effects.

---

## Borders

```css
Border Light: #E5E7EB
Border Medium: #D1D5DB
Border Strong: #9CA3AF
```

Borders should be subtle and never dominate the interface.

---

# Semantic Colors

## Success

```css
#16A34A
```

Use for:

* Verified records
* Successful actions
* Healthy pipeline status
* Completed tasks

---

## Warning

```css
#F59E0B
```

Use for:

* Pending imports
* Caution states
* Processing indicators
* Warnings

---

## Error

```css
#DC2626
```

Use for:

* Failed jobs
* Validation errors
* Critical alerts
* Missing data

---

## Information

```css
#2563EB
```

Use for:

* Informational messages
* Links
* Documentation
* Tooltips

---

# Hero Section Gradient

The landing page should feel inviting and natural.

```css
linear-gradient(
135deg,
#F8FAF8 0%,
#EAF4EF 45%,
#DDEFE7 100%
)
```

The hero should appear soft rather than dramatic.

---

# Primary CTA Gradient

```css
linear-gradient(
135deg,
#1B5E4A,
#0F766E
)
```

This creates depth while maintaining professionalism.

---

# Card Background Gradient

```css
linear-gradient(
180deg,
#FFFFFF,
#F7FBF8
)
```

Cards should subtly separate from the page without heavy shadows.

---

# Navigation Bar

Recommended style:

```css
Background:
rgba(255,255,255,0.8)

Backdrop Blur:
20px

Border:
1px solid #E5E7EB
```

The navbar should feel light and premium.

---

# Button Styles

## Primary

Background:

```css
#1B5E4A
```

Hover:

```css
#164C3C
```

Text:

```css
#FFFFFF
```

---

## Secondary

Background:

```css
#FFFFFF
```

Border:

```css
#D1D5DB
```

Text:

```css
#1B5E4A
```

---

## Ghost

Transparent background.

Hover:

```css
rgba(27,94,74,0.08)
```

---

# Badge Colors

Verified

```css
Background: #DCFCE7
Text: #166534
```

Pipeline

```css
Background: #DBEAFE
Text: #1D4ED8
```

Warning

```css
Background: #FEF3C7
Text: #92400E
```

Error

```css
Background: #FEE2E2
Text: #991B1B
```

Premium

```css
Background: #FEF3C7
Text: #92400E
```

---

# Status Indicators

Healthy

```css
#16A34A
```

Processing

```css
#F59E0B
```

Queued

```css
#2563EB
```

Failed

```css
#DC2626
```

Offline

```css
#6B7280
```

---

# Data Visualization Palette

Charts should remain elegant and colorblind-friendly.

Recommended sequence:

```css
#1B5E4A
#0F766E
#2563EB
#D4A017
#8B5CF6
#16A34A
#DC2626
#64748B
```

Avoid rainbow palettes unless categorically necessary.

---

# Search Interface

Focused search field:

```css
Border:
#1B5E4A

Shadow:
0 0 0 4px rgba(27,94,74,0.1)
```

Autocomplete cards:

```css
Background:
#FFFFFF

Hover:
#F7FBF8
```

---

# Sidebar

Background:

```css
#FFFFFF
```

Selected item:

```css
Background:
#EAF4EF

Text:
#1B5E4A
```

Hover:

```css
#F7FBF8
```

---

# Tables

Header:

```css
#F1F5F2
```

Row hover:

```css
#F8FAF8
```

Selected row:

```css
#EAF4EF
```

Borders:

```css
#E5E7EB
```

---

# Footer

Background:

```css
#1A1A1A
```

Text:

```css
#D1D5DB
```

Links:

```css
#FFFFFF
```

Accent:

```css
#D4A017
```

---

# Dark Mode

## Background

```css
#0F172A
```

## Surface

```css
#1E293B
```

## Card

```css
#273549
```

## Primary

```css
#34D399
```

## Secondary

```css
#2DD4BF
```

## Text

```css
Primary:
#F8FAFC

Secondary:
#CBD5E1
```

## Border

```css
#334155
```

The dark theme should preserve readability while maintaining the same premium identity.

---

# Color Usage Guidelines

* Never use more than three accent colors on a single screen.
* Keep backgrounds predominantly neutral.
* Use green for trust and primary interactions.
* Use teal for exploration and data-focused elements.
* Reserve gold exclusively for emphasis and premium content.
* Avoid highly saturated reds or blues unless indicating status.
* Maintain consistent semantic meaning across the application.

---

# Visual Personality

The interface should feel like:

* A premium digital encyclopedia
* A modern scientific publication
* A trusted research platform
* An editorial knowledge base
* A beautifully organized information system

It should avoid looking like:

* A generic admin dashboard
* A spreadsheet viewer
* A corporate ERP
* A brightly colored marketing site
* A cluttered database interface

---

# Final Color Summary

## Brand

```
Primary      #1B5E4A
Secondary    #0F766E
Accent       #D4A017
```

## Neutrals

```
Background   #F8FAF8
Surface      #FFFFFF
Text         #1A1A1A
Muted        #6B7280
Border       #E5E7EB
```

## Semantic

```
Success      #16A34A
Warning      #F59E0B
Error        #DC2626
Info         #2563EB
```

## Dark Mode

```
Background   #0F172A
Surface      #1E293B
Primary      #34D399
Secondary    #2DD4BF
Text         #F8FAFC
```

---

# Final Vision

The color system should reinforce the platform's identity as a premium, trustworthy, and intelligent knowledge ecosystem. Every shade should support readability, exploration, and confidence while remaining timeless and scalable. The result should feel sophisticated, calm, and purpose-driven rather than decorative or trend-focused.

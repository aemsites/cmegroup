# Product Tabs Block

## Overview

The `product-tabs` block populates dynamic content into tab sections from the source document. It discovers tabs from the DOM, loads appropriate modules, and handles API-backed content independently for each tab.

## Architecture

### Simple, DOM-Driven Approach

- **No metadata** - tabs are controlled entirely by the source document structure
- **On-demand loading** - only loads modules for tabs that exist in the DOM
- **Independent loading** - each tab loads independently using `Promise.allSettled`
- **Graceful failures** - if one tab fails, others continue to work

### How It Works

1. Finds all `.section.tabs` elements in the DOM
2. For each tab section with a `.tabs-content` marker:
   - Loads the appropriate tab module based on `data-tab-id`
   - Populates dynamic content into the marker
   - Decorates and loads dynamic blocks
3. Sets up Futures/Options toggles for tabs that need them
4. Initializes the tabs UI

## Source Document Structure

Each tab section in the source document should have:

```html
<div class="section tabs" data-tab-id="quotes" data-tab-title="Quotes">
  <!-- Manually curated content (optional) -->
  <div class="promo">...</div>
  
  <!-- Dynamic content marker -->
  <div class="tabs-content block" data-block-name="tabs-content">
    <div><div></div></div>
  </div>
  
  <!-- More manually curated content (optional) -->
  <div class="cta">...</div>
</div>
```

### Key Attributes

- `data-tab-id`: Unique identifier for the tab (e.g., "quotes", "settlements")
- `data-tab-title`: Display title for the tab navigation
- `.tabs-content`: Marker block where dynamic content will be injected

## Tab Modules

### Convention-Based Loading

Tabs are loaded dynamically based on the `data-tab-id` attribute in the source document. No hardcoded registry needed!

**Convention**: `data-tab-id="quotes"` → automatically tries to load `tabs/quotes.js`

- If the module exists → dynamic content is populated
- If the module doesn't exist → tab displays static content only (no error)

### Creating a New Tab

**For Authors (No Dev Required):**
1. Add tab section to source document with `data-tab-id` and `data-tab-title`
2. Add static content blocks (CTAs, promos, etc.)
3. Done! Tab appears with static content.

**For Dynamic Content (Dev Required):**
1. Author adds `<div class="tabs-content">` marker to source doc
2. Developer creates `tabs/{tab-id}.js` matching the `data-tab-id`
3. Module exports function that builds dynamic content
4. Done! Dynamic content populates automatically.

### Tab Module Structure

Each tab module exports a default function:

```javascript
// tabs/example.js

// Default export function that builds tab content
// Receives metadata from source document (data-tab-id, data-tab-title, data-futures-options-toggle)
export default async function buildExampleTab(metadata = {}) {
  const { tabId, tabTitle, hasFuturesOptionsToggle } = metadata;
  
  // Build your dynamic blocks here
  const blocks = [];
  const cardsBlock = buildBlock('cards', [/* content */]);
  const tableBlock = buildBlock('table', [/* content */]);
  blocks.push(cardsBlock, tableBlock);
  
  // Return content using tab metadata from source doc
  return createTabSection(tabId, tabTitle, blocks);
}
```

**Important**: Tab metadata (`tabId`, `tabTitle`) comes from the source document's `data-tab-id` and `data-tab-title` attributes. Never hardcode these values in your tab module!

## Dynamic Blocks

Dynamic blocks (API-backed) should be marked with the `.dynamic` class:

```javascript
const block = buildBlock('cards', [[content1], [content2]]);
block.classList.add('dynamic', 'market-recap');
```

This ensures proper decoration and loading.

## Futures/Options Toggle

Tabs can optionally support a Futures/Options toggle system via metadata (`data-futures-options-toggle="true"`).

### Source Document Setup

```html
<div class="section tabs-content-container" 
     data-tab-id="settlements" 
     data-tab-title="Settlements"
     data-futures-options-toggle="true">
  <div class="tabs-content block">
    <div><div></div></div>
  </div>
</div>
```

### Standard Tab Structure (All tabs follow this pattern)

```javascript
// tabs/settlements.js

// Content Creation Functions
async function createFuturesContent() {
  const blocks = [];
  blocks.push('<p>Futures settlements content</p>');
  // Add API-backed blocks, buildBlock calls, etc.
  return blocks;
}

async function createOptionsContent() {
  const blocks = [];
  blocks.push('<p>Options settlements content</p>');
  // Add API-backed blocks, buildBlock calls, etc.
  return blocks;
}

// Main Content Functions
async function createSettlementsContent(tabId, tabTitle, hasFuturesOptionsToggle) {
  const allBlocks = [];

  if (hasFuturesOptionsToggle) {
    // With toggle: show both futures and options with toggle UI
    try {
      const toggleContent = await organizeToggleContent({
        futuresBlocks: await createFuturesContent(),
        optionsBlocks: await createOptionsContent(),
        defaultActive: TOGGLE_CONSTANTS.toggleTypes.futures,
        tabId,
      });
      if (toggleContent) {
        allBlocks.push(toggleContent);
      }
    } catch (error) {
      allBlocks.push(createErrorMessage(tabTitle));
    }
  } else {
    // Without toggle: show default futures content only
    try {
      const futuresContent = await createFuturesContent();
      allBlocks.push(...futuresContent);
    } catch (error) {
      allBlocks.push(createErrorMessage(tabTitle));
    }
  }

  return allBlocks;
}

export default async function buildSettlementsTab(metadata = {}) {
  const { tabId, tabTitle, hasFuturesOptionsToggle } = metadata;

  let blocks = [];
  try {
    blocks = await createSettlementsContent(tabId, tabTitle, hasFuturesOptionsToggle);
  } catch (error) {
    blocks = [createErrorMessage(tabTitle)];
  }
  return createTabSection(tabId, tabTitle, blocks);
}
```

**Key Points:**
- All tabs follow this exact pattern for consistency
- `createFuturesContent()` is always called (default view)
- `createOptionsContent()` is only used when toggle is enabled
- Toggle is controlled via metadata (`data-futures-options-toggle="true"`)
- Without toggle metadata, only Futures content displays (no toggle UI)

## Error Handling

All tabs use a centralized error handling utility:

```javascript
import { createErrorMessage } from '../helpers/utils.js';

// Usage
allBlocks.push(createErrorMessage(tabTitle)); // e.g., "Unable to load Quotes"
```

**Error Handling Levels:**
- **Tab-level**: If a tab module fails to build, displays "Unable to load [Tab Title]"
- **Block-level**: If a specific block fails, it shows an error but doesn't break other blocks
- **Graceful degradation**: Manually curated content always displays, even if dynamic content fails
- **Independent failures**: Each tab and block loads independently - one failure doesn't affect others

## Usage

The block is automatically initialized by the product template when `.tabs-content` markers are detected in the DOM.

No manual initialization is required.

## File Structure

```
product-tabs/
├── product-tabs.js         # Main block logic
├── product-tabs.css        # Block styles
├── README.md              # This file
├── helpers/
│   ├── constants.js       # Shared constants
│   └── utils.js           # Shared utilities
├── tabs/
│   ├── quotes.js          # Quotes tab logic
│   ├── settlements.js     # Settlements tab logic
│   ├── volume.js          # Volume tab logic
│   ├── specs.js           # Specs tab logic
│   ├── margins.js         # Margins tab logic
│   └── calendar.js        # Calendar tab logic
└── mock-api/             # Mock API data for development
    ├── reports.json
    ├── quotes/
    │   ├── quotes.json
    │   ├── cvol.json
    │   └── quotes-v2-getlabels.json
    └── expirations.json
```

## Key Principles

1. **Source document is source of truth** - tab IDs, titles, order, and visibility controlled by HTML
2. **Loose coupling** - tab modules receive metadata from source doc, never hardcode values
3. **Convention over configuration** - file names match tab IDs, no hardcoded registry
4. **Progressive enhancement** - static content loads immediately, dynamic content loads asynchronously
5. **Independent components** - tabs and blocks load independently, failures are isolated
6. **Minimal abstraction** - simple, direct code that's easy to understand and maintain
7. **Performance conscious** - only loads what's needed, when it's needed
8. **Author empowerment** - authors can create static tabs without developer intervention

## Related Blocks

- **tabs** (`blocks/dynamic/tabs/`) - Base tabs UI system
- **hero-baseball** (`blocks/hero-baseball/`) - Product hero block
- **cards** (`blocks/cards/`) - Various card layouts
- **table** (`blocks/table/`) - Table block with variants


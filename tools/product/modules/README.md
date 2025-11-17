# Product Manager Modules

Each module handles a specific tab's functionality.

## Module Structure

Each module should export:
- Main function(s) for core functionality
- `setup[ModuleName]Listeners()` function for event handling

## Available Modules

### create.js ✅ IMPLEMENTED
Handles product creation from templates.
- Copy tab folders and files
- Generate landing page with metadata
- Parallel API operations

### list.js 🚧 PLANNED
Display and manage existing products.
- List all products
- Search and filter
- Quick actions (edit/delete)

### edit.js 🚧 PLANNED
Edit existing product metadata.
- Load product data
- Update metadata only
- Don't touch tab content

### delete.js 🚧 PLANNED
Delete products and files.
- Single product deletion
- Bulk operations
- Confirmation dialogs

## Adding a New Module

1. Create `modules/your-module.js`
2. Export main functions and `setupYourModuleListeners()`
3. Import in `product.js`
4. Call `setupYourModuleListeners()` in `initApp()`
5. Add tab button and content in `product.html`
6. Update tab navigation CSS if needed


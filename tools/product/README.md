# Product Manager

Web-based tool for creating and managing product pages in the CME Group website using the DA Admin API.

## Overview

The Product Manager provides two modes of operation:

- **Single Product Creation**: Create individual product pages with full control over metadata and tab selection
- **Bulk Product Creation**: Create multiple products from CSV files for efficient batch operations

## Features

### Single Product Mode

- Copy product templates from a source location
- Selectively copy tab-specific folders and HTML files
- Generate landing pages with custom metadata
- Support for multiple product tabs (Overview, Quotes, Settlements, Volume & OI, Specs, Margins, Calendar)
- Conflict detection with optional overwrite
- Real-time validation and feedback

### Bulk Product Mode

- CSV file upload with drag-and-drop support
- Preview and validate products before creation
- Automatic conflict detection for existing products
- Dry run mode to test without creating
- Progress tracking with detailed status
- Results summary with success/warning/error categorization
- Per-product destination folder configuration
- Optional overwrite mode for replacing existing products

## Prerequisites

- Access to DA Admin API with valid authentication
- Source product template at the specified path
- Appropriate folder permissions

## Configuration

### Global Settings

- **Organization/Site**: `/cmegroup/www`
- **Source Template**: `/drafts/kunwar/product-app/product-template/product`

### Per-Product Settings (Bulk Mode)

Each product in the CSV specifies:
- Title, description, and metadata
- Product ID and slug
- Tab selection
- Destination folder path

## Usage

### Single Product Creation

1. Navigate to the Create tab
2. Configure paths (org/site, source template, destination)
3. Enter product metadata (title, description, name, ID, slug)
4. Select tabs to include
5. Click "Create Product"

### Bulk Product Creation

1. Navigate to the Bulk tab
2. Configure global settings (org/site, source template)
3. Upload CSV file or drag-and-drop
4. Review preview table and validation status
5. Select products to create using checkboxes
6. Run "Dry Run" to validate (optional)
7. Click "Create Products" to execute

## CSV Format

### Required Columns

```
title,description,product_name,product_id,product_slug,tabs,destination
```

### Column Descriptions

- **title**: Page title for SEO (minimum 3 characters)
- **description**: Meta description for search engines (minimum 10 characters)
- **product_name**: Display name for the product (minimum 2 characters)
- **product_id**: Unique identifier
- **product_slug**: URL-friendly name, lowercase alphanumeric with hyphens
- **tabs**: Pipe-separated list (e.g., `overview|quotes|settlements`)
- **destination**: Destination folder path (e.g., `/drafts/kunwar/product-app/grains`)

### Valid Tab Names

- overview
- quotes
- settlements
- volume
- specs
- margins
- calendar

### Example CSV

```csv
title,description,product_name,product_id,product_slug,tabs,destination
"Corn Futures","Trade corn futures and options","Corn","300","corn","overview|quotes|settlements","/drafts/kunwar/product-app/grains"
"Crude Oil Futures","Energy futures for crude oil","Crude Oil","CL","crude-oil","overview|quotes","/drafts/kunwar/product-app/energy"
```

## Output Structure

The tool creates the following structure:

```
/destination/product-slug/
├── overview/           (if selected)
├── quotes/             (if selected)
├── settlements/        (if selected)
├── overview.html       (if exists in template)
├── quotes.html         (if exists in template)
└── settlements.html    (if exists in template)

/destination/product-slug.html (landing page)
```

## Landing Page Structure

Generated landing pages include:

- Hero section with baseball card block
- Product tabs block with selected tabs
- Metadata block containing:
  - Title
  - Description
  - Template (set to "product")
  - Product name
  - Product ID

## API Endpoints

- `https://admin.da.live/source` - Create/update HTML content
- `https://admin.da.live/copy` - Copy folders and files

## Technical Architecture

### Modular Structure

```
tools/product/
├── product.html          Main UI with tab navigation
├── product.css           Shared styles
├── product.js            App initialization and routing
├── shared/               Shared utilities
│   ├── api.js           DA Admin API wrapper
│   ├── ui.js            Toast notifications, activity log
│   └── state.js         Application state management
├── modules/              Tab-specific functionality
│   ├── create.js        Single product creation
│   ├── bulk.js          Bulk operations
│   ├── move.js          Move operations (planned)
│   ├── update.js        Update operations (planned)
│   └── delete.js        Delete operations (planned)
└── sample-products.csv  Example CSV file
```

### Design Benefits

- Separation of concerns with clear module boundaries
- Reusable API and UI components
- Easy to extend with new tabs and features
- Independent testing of modules
- Clear code organization

## Activity Log

The Activity Log tracks all operations:

- Product creation steps
- Tab folder copying progress
- Tab HTML file copying progress
- Landing page creation
- Errors and warnings
- Validation results

Access via the Activity Log button in the header. Log entries persist in browser localStorage.

## Validation Rules

### Required Fields

- Title (minimum 3 characters)
- Description (minimum 10 characters)
- Product name (minimum 2 characters)
- Product ID
- Product slug
- At least one tab
- Destination folder (bulk mode)

### Format Rules

- Product slug must be lowercase alphanumeric with hyphens only
- Destination path should start with `/`
- Tab names must match valid tab list
- No duplicate slugs within a CSV file

## Conflict Handling

The Product Manager detects and handles conflicts when a product already exists at the destination path.

### Single Product Mode

**Default Behavior**: Product creation fails if a product already exists at the destination path.

**Overwrite Option**: Check the "Overwrite if exists" checkbox to replace existing products.

- When checked, the system prompts for confirmation before replacing
- All existing files (landing page, tab folders, tab HTML files) will be replaced
- Destructive operation - use with caution

**Workflow**:
1. System checks if product exists at `/destination/product-slug.html`
2. If exists and overwrite is unchecked: Error message displayed
3. If exists and overwrite is checked: Confirmation dialog shown
4. If confirmed: Existing product is replaced with new content

### Bulk Product Mode

**Default Behavior**: Existing products are skipped during bulk creation.

**Overwrite Option**: Check the "Overwrite existing products" checkbox to replace them.

**Preview Table Indicators**:
- `✓ Valid` - Product does not exist, ready to create
- `⚠️ EXISTS` - Product already exists at destination (will be skipped unless overwrite is enabled)
- `❌ Error` - Validation failed, will not be processed

**Workflow**:
1. After CSV upload, system checks all destination paths for existing products
2. Preview table shows `⚠️ EXISTS` badge for conflicts
3. User can choose to skip or overwrite existing products
4. During processing:
   - If overwrite unchecked: Existing products are skipped
   - If overwrite checked: Existing products are replaced
5. Results summary shows which products were created, skipped, or failed

**Dry Run with Conflicts**:
- Dry run mode detects and reports conflicts without making changes
- Use to preview which products would be skipped or replaced

### Conflict Detection

The system checks for product existence by:
1. Constructing the full product path: `/org/site/destination/slug.html`
2. Using HTTP HEAD request to DA Admin API
3. Caching results to avoid repeated checks

### Best Practices

- **Before Bulk Creation**: Always run a dry run to check for conflicts
- **Review Preview Table**: Check for `⚠️ EXISTS` badges before proceeding
- **Selective Overwrite**: Uncheck conflicting products if you don't want to replace them
- **Backup Important Data**: Make backups before using overwrite mode
- **Test First**: Use a test destination folder when unsure

### Design Philosophy

**CREATE Mode**: Designed for new products - fails safely when conflicts detected  
**UPDATE Mode** (Coming Soon): Designed for modifications - requires product to exist  
**DELETE Mode** (Coming Soon): Designed for removal - warns if product doesn't exist

This separation ensures clear intent and prevents accidental data loss.

## Dry Run Mode

Dry run validates all products without creating anything:

- Tests all validation rules
- Checks for duplicate slugs
- Verifies tab names
- Identifies missing required fields
- No API calls are made
- Safe to run multiple times

## Error Handling

The tool provides detailed error reporting:

- Invalid CSV format
- Missing required fields
- Invalid field formats
- Duplicate slugs
- API failures
- Partial success handling

Results are categorized as:
- Success: Product created successfully
- Warning: Created with non-critical issues
- Error: Failed to create

## Limitations

- No undo functionality (use overwrite with caution)
- Products with duplicate slugs within CSV will fail validation
- Source template must exist and be accessible
- Tab folders and files must follow naming conventions
- Sequential processing in bulk mode (one product at a time)
- Conflict detection requires network request per product

## Notes

- All operations are logged to browser console and Activity Log
- Activity Log persists in localStorage
- Tab display names are automatically mapped (e.g., "volume" becomes "Volume & OI")
- Copy operations run in parallel for better performance
- Modular ES6 architecture with clean separation of concerns

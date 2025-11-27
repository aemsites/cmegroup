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
- Real-time validation and feedback

### Bulk Product Mode

- CSV file upload with drag-and-drop support
- Preview and validate products before creation
- Dry run mode to test without creating
- Progress tracking with detailed status
- Results summary with success/warning/error categorization
- Per-product destination folder configuration

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

- No undo functionality
- Products with duplicate slugs will fail validation
- Source template must exist and be accessible
- Tab folders and files must follow naming conventions
- Sequential processing (one product at a time)

## Notes

- All operations are logged to browser console and Activity Log
- Activity Log persists in localStorage
- Tab display names are automatically mapped (e.g., "volume" becomes "Volume & OI")
- Copy operations run in parallel for better performance
- Modular ES6 architecture with clean separation of concerns

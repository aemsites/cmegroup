# Product Manager

A web-based tool for creating and managing product pages in the CME Group website using the DA (Document Authoring) Admin API.

## Features

### Product Creation
- Copy product templates from a source location
- Selectively copy tab-specific folders and HTML files
- Generate landing pages with custom metadata
- Support for multiple product tabs (Overview, Quotes, Settlements, Volume & OI, Specs, Margins, Calendar)

### User Interface
- **Visual Hierarchy**: Configuration sidebar prioritized with distinct styling
- **Grouped Sections**: Organized into SEO Metadata, Product Information, and Template Selection
- **Required Field Indicators**: Red asterisks (*) mark mandatory fields
- **Configuration inputs** for organization/site, source, and destination paths
- **Product metadata fields** (Title, Description, Product Name, Product ID, Product Slug)
- **3-column tab grid** (responsive: 2 columns on tablets, 1 column on mobile)
- **Tab selection** with "Select All" and "Unselect All" options
- **Activity log modal** for tracking operations
- **Toast notifications** for real-time feedback

### Technical Features
- DA SDK authentication and token management
- Parallel API calls for efficient tab copying
- Automatic metadata generation in AEM Edge Delivery format
- Local storage for activity log persistence

## Usage

### Prerequisites
- Access to DA Admin API with valid authentication
- Source product template at the specified path
- Destination folder permissions

### Creating a Product

1. **Configure Paths**
   - Organization/Site: `/cmegroup/www`
   - Source: Path to template (e.g., `/drafts/kunwar/markets/corn`)
   - Destination: Target folder (e.g., `/drafts/kunwar/product-app/markets`)

2. **Enter Product Details**
   - Title: Page title for SEO
   - Description: Meta description
   - Product Name: Display name (e.g., "Soybeans")
   - Product ID: Unique identifier (e.g., "300")
   - Product Slug: URL-friendly filename (e.g., "soybeans")

3. **Select Tabs**
   - Choose which tabs to include in the product
   - Only selected tab folders and files will be copied

4. **Create Product**
   - Click "Create Product" button
   - Monitor progress via toast notifications
   - Check Activity Log for detailed operation history

## Output Structure

The tool creates the following structure:

```
/destination/product-slug/
├── overview/                 (if selected)
├── quotes/                   (if selected)
├── settlements/              (if selected)
├── overview.html             (if exists in template)
├── quotes.html               (if exists in template)
├── settlements.html          (if exists in template)
└── ...

/destination/product-slug.html (landing page)
```

## Landing Page Structure

Generated landing pages include:
- Hero section with baseball card block
- Product tabs block with selected tabs
- Metadata block with:
  - Title
  - Description
  - Template (set to "product")
  - Product name
  - Product ID

## Activity Log

The Activity Log tracks:
- Product creation steps
- Tab folder copying progress
- Tab HTML file copying progress
- Landing page creation
- Errors and warnings

Access the Activity Log via the button in the top-right header.

## API Endpoints Used

- `https://admin.da.live/source` - Create/update HTML content
- `https://admin.da.live/copy` - Copy folders and files

## Architecture

The application uses a modular, tabbed architecture for easy extension:

### File Structure

```
tools/product/
├── product.html          - Main UI with tab navigation
├── product.css           - Shared styles
├── product.js            - Main app initialization and routing
├── shared/               - Shared utilities
│   ├── api.js           - DA Admin API wrapper
│   ├── ui.js            - Toast notifications, activity log
│   └── state.js         - Shared application state
├── modules/              - Tab-specific functionality
│   ├── create.js        - ✅ Create products (ACTIVE)
│   ├── move.js          - 🚧 Move products (PLANNED)
│   ├── update.js        - 🚧 Update products (PLANNED)
│   ├── delete.js        - 🚧 Delete products (PLANNED)
│   └── README.md        - Module documentation
├── icons/                - UI icons
├── product-old.js        - Legacy monolithic version (backup)
└── README.md             - This file
```

### Modular Design Benefits

- **Easy to extend**: Add new tabs without modifying existing code
- **Separation of concerns**: Each module handles its own functionality
- **Reusable utilities**: Shared API and UI components
- **Maintainable**: Clear structure and responsibilities
- **Testable**: Modules can be tested independently

## Current Tabs

### Create Product (✅ Active)
Full product creation from templates with tab selection and metadata.
- Organized into clear sections: Configuration, SEO Metadata, Product Information, Template Selection
- Required field validation
- 3-column responsive tab grid
- Parallel copy operations for performance

### Move Product (🚧 Planned)
Move products from one location to another.

### Update Product (🚧 Planned)
Update product metadata without touching tab content.

### Delete Product (🚧 Planned)
Delete products with confirmation and bulk operations.

## Extending the Application

To add a new tab:

1. Create `modules/your-feature.js`
2. Export main functions and `setupYourFeatureListeners()`
3. Import in `product.js` and call setup function
4. Add tab button to `product.html`
5. Add tab content section to `product.html`

See `modules/README.md` for detailed instructions.

## Limitations

- No undo functionality
- Overwrites existing products without warning
- Source path must exist and be accessible
- Tab folders/files must follow naming conventions

## Notes

- All operations are logged to browser console and Activity Log
- Activity Log persists in localStorage
- Tab display names are automatically mapped (e.g., "volume" → "Volume & OI")
- Copy operations run in parallel for better performance
- Modular ES6 architecture with clean separation of concerns


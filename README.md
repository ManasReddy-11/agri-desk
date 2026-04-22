# AgriDesk - Farmer to Consumer Marketplace

A responsive web app with complete navigation flows for the AgriDesk platform - a farmer to consumer marketplace. Built with React, Vite, Tailwind CSS, and React Router.

## Features

✨ **Role-Based Navigation**
- **Login Page**: Select role (Consumer, Farmer, Admin) for personalized experience
- **Consumer Home**: Browse fresh products, search, filter, and manage cart with bottom navigation
- **Farmer Dashboard**: Manage products, add new listings, track orders, and view inventory
- **Admin Dashboard**: System overview, user management, and system health monitoring

🎨 **Design Features**
- Clean green agriculture theme with light gradients
- Modern white card layouts with shadows
- Responsive design for all screen sizes
- AgriDesk header with logo reused across all screens
- Smooth transitions and interactive components

💚 **Theme**
- Light green background gradients
- Green primary buttons with hover effects
- Orange accent color for fruit icon
- Consistent rounded corners (xl, 2xl, 3xl)
- White cards with subtle shadows

⚙️ **Technology Stack**
- **React 18** - UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side navigation

## Project Structure

```
src/
├── components/
│   ├── Logo.jsx          # AgriDesk logo with orange fruit and green leaf
│   ├── LoginCard.jsx     # Original login form component
│   └── Header.jsx        # Header with logo and logout button
├── pages/
│   ├── Login.jsx         # Login page with role selection
│   ├── ConsumerHome.jsx  # Consumer dashboard with products
│   ├── FarmerDashboard.jsx    # Farmer management interface
│   └── AdminDashboard.jsx     # Admin system overview
├── App.jsx               # Router configuration
├── main.jsx              # React entry point
└── index.css             # Tailwind directives

├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
└── vite.config.js        # Vite configuration
```

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173/`

### Build

Create a production build:
```bash
npm run build
```

### Preview

Preview the production build locally:
```bash
npm run preview
```

## Navigation Flow

### Login Page (`/`)
- Select role: Consumer, Farmer, or Admin
- Enter email and password
- Redirects to role-specific dashboard on login

### Consumer Home (`/consumer`)
**Features:**
- Search bar to find products and farmers
- Filter chips (All, Vegetables, Fruits, Dairy, Organic)
- Product grid with:
  - Product image (emoji icons)
  - Price in Indian Rupees (₹)
  - Farmer name
  - Rating stars
  - Add to cart button (adds item to local cart state)
- Header includes a cart icon with item count; tap to view cart
- Bottom navigation with:
  - Home - Browse products
  - Orders - Order history
  - Favorites - Saved products
  - Profile - User information
- Logout button in header

### Cart Screen (`/consumer/cart`)
- Displays all products added to cart
- Quantity controls (+ / -) for each item
- Item subtotal and total price (₹)
- "Proceed to Checkout" button navigates to checkout

### Checkout Screen (`/consumer/checkout`)
- Delivery address textarea
- Payment method selection (COD, Card, UPI)
- Order summary with total price
- "Place Order" button clears cart and returns to home

### Farmer Dashboard (`/farmer`)
**Features:**
- Welcome message and quick stats:
  - Total Products (units in stock)
  - Inventory Value (₹)
  - Total Orders received
  - Completed Orders
- Add Product functionality:
  - Product name input
  - Quantity (kg) input
  - Price (₹/kg) input
  - Form validation
- Product List:
  - View all posted products
  - Stock status indicators
  - Delete product option
  - Price per kg display
- Recent Orders:
  - Order ID and status
  - Product details
  - Date and price
  - Completed/Processing status
- Logout button in header

### Admin Dashboard (`/admin`)
**Features:**
- System Overview Tab:
  - Total Products (248)
  - Total Farmers (42)
  - Total Orders (156)
  - Revenue (₹45,320)
  - Quick action buttons: View Logs, Manage Roles, Settings, Reports
- Users Tab:
  - Recent users list
  - User role display
  - Approval status
  - Join date tracking
- System Health Tab:
  - Server status with uptime percentage
  - Database performance metrics
  - API response time
  - Progress bar indicators
  - System settings (toggles):
    - Maintenance Mode
    - Email Notifications
    - Auto Backups
- Logout button in header

## Component Details

### Header Component
- Displays AgriDesk logo
- Shows logout button on all authenticated pages
- Navigates to login on logout

### Logo Component
- Custom SVG with orange fruit icon
- Green leaf accent
- Bold "AgriDesk" text
- Tagline: "Farm to Table Marketplace"

### Login Component
- Role selection with visual feedback
- Email and password validation
- Role-based routing using `useNavigate`

### Consumer Home Component
- Product grid with search functionality
- Dynamic pricing in Indian Rupees
- Bottom navigation for multi-tab interface
- Sample data for 6 products

### Farmer Dashboard Component
- Summary cards with statistics
- Add product form modal
- Editable product list
- Order tracking with status badges
- Delete product functionality

### Admin Dashboard Component
- Tabbed interface (Overview, Users, System)
- Gradient stat cards
- User management list
- System health monitoring
- Settings toggles

## Customization

### Colors
Edit `tailwind.config.js` to customize the green palette:
```javascript
colors: {
  primary: {
    600: '#16a34a',
    700: '#15803d',
  },
}
```

### Add New Screens
1. Create new page component in `src/pages/`
2. Add route in `App.jsx`:
```jsx
<Route path="/your-page" element={<YourComponent />} />
```

### Modify Product Data
Edit the sample data arrays in:
- `ConsumerHome.jsx` - products array
- `FarmerDashboard.jsx` - products state
- `AdminDashboard.jsx` - stats array

## Notes

- This is a **UI-only implementation** with no backend integration
- No actual authentication or database calls
- All state is local to components
- Perfect for prototyping and design validation
- Ready to integrate with backend APIs

## Future Enhancements

- Add API integration for real data
- Implement actual authentication
- Add payment gateway integration
- Real-time order tracking
- Push notifications
- User reviews and ratings
- Advanced search and filtering
- Wishlist functionality
- Inventory management API calls

## License

© 2026 AgriDesk. All rights reserved.


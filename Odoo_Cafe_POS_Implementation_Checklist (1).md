# Odoo Cafe POS — Implementation Checklist (from Wireframes)

Derived directly from the Excalidraw board. Organized into Pages/Screens, API Endpoints, and Features per module so it can double as a sprint backlog.

---

## 1. PAGES & SCREENS TO BE BUILT

### Auth
- [ ] Login page (Email/Username, Password)
- [ ] Signup page (Name, Email/Username, Password)

### POS Terminal — Session
- [ ] POS Landing / Open Session screen (shows last open date + last closing sale amount, "Open Session" CTA, Settings + Customer Display links)

### POS Terminal — Order View
- [ ] Order View (3-pane: Product grid / Cart / Payment)
- [ ] Floor Pop-up — table grid with floor selector dropdown
- [ ] Coupon Code popup (manual code entry)
- [ ] Customer search/select popup
- [ ] Customer Create/Edit popup (within POS)
- [ ] Receipt-via-Email popup

### POS Terminal — Orders
- [ ] Orders List (search by customer/order number/date, status column)
- [ ] Order Detail popup — Draft state (Delete + Edit Order actions)
- [ ] Order Detail popup — Paid state (view-only, no actions)

### POS Terminal — Table View
- [ ] Table View page (all floors/tables, occupied vs free styling)

### POS Terminal — Customer Management
- [ ] Customer List popup (search, list with name/email/phone)
- [ ] Customer Edit/Delete popup

### Backend Admin — Products & Categories
- [ ] Product List page (Name, Category, Price, Tax columns; row select → Delete/Archive)
- [ ] Product Create/Edit form
- [ ] Category "Create & Edit" inline popup (triggered from inside the Product form)
- [ ] Category List page (inline-editable table: Name, Color swatches, Delete)

### Backend Admin — Payment Methods
- [ ] Payment Method List page (Name, Type, ID, Activate toggle, Delete)
- [ ] Payment Method Create/Edit form (UPI variant shows live QR preview when Type = UPI)

### Backend Admin — Coupon & Promotion
- [ ] Coupon & Promotion List page (Name, Type, Active-programme count, Activate, Delete)
- [ ] Coupon Create/Edit form (code + % or fixed discount)
- [ ] Automated Promotion (Product-based) form (Min Quantity trigger)
- [ ] Automated Promotion (Order-based) form (Min Order Amount trigger)

### Backend Admin — Booking / Floor & Table
- [ ] Floor & Table management CRUD (**gap — see Open Questions below**)

### Backend Admin — User/Employee
- [ ] User/Employee List page (Name, Type filter, Status)
- [ ] User/Employee Create popup
- [ ] Row action menu (Delete / Archive / Change Password)
- [ ] Change Password popup

### Backend Admin — Reports
- [ ] Reports/Dashboard page (filters, KPI cards, charts, tables, export)

### Customer Facing Display (`/customer-display`)
- [ ] Order View state (live cart mirror: items, qty, price, subtotal, tax, discount, total)
- [ ] Payment View state (UPI QR + amount)
- [ ] Order Completion state (thank-you message)

### Kitchen Display System (fixed URL, e.g. `/KDS`)
- [ ] KDS Board (To Cook / Preparing / Completed columns + counts, search, Category/Product filter sidebar)

### Self Ordering — Admin Config
- [ ] Mobile Order settings page (Self Ordering toggle, Online Ordering vs QR Menu mode, background image/color, payment method section)
- [ ] QR Code generator/preview page (per-table QR grid, downloadable as PDF)

### Self Ordering — Customer Mobile Web (opened via scanned QR, no login)
- [ ] Splash screen (auto-scrolling background, "Order Here" CTA)
- [ ] Product Browse screen (category tabs, search, product grid)
- [ ] Product Detail modal (variant radio + addon checkboxes + qty stepper)
- [ ] Cart/Payment screen (editable items, coupon entry, totals, Confirm)
- [ ] Coupon Code popup (mobile)
- [ ] Order Confirmed screen (checkmark, order number, total, Track My Order)
- [ ] Order History/Track screen (live status pulled from KDS)

**Page count: ~38 distinct screens/modals across 8 modules.**

---

## 2. API ENDPOINTS TO BE BUILT

### Auth
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`

### Users / Employees
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/password`
- `PATCH /api/v1/users/:id/archive`
- `DELETE /api/v1/users/:id`

### Categories
- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PATCH /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`

### Products
- `GET /api/v1/products?search=&category=&status=`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `PATCH /api/v1/products/:id/archive`
- `DELETE /api/v1/products/:id`

### Payment Methods
- `GET /api/v1/payment-methods`
- `POST /api/v1/payment-methods`
- `PATCH /api/v1/payment-methods/:id`
- `PATCH /api/v1/payment-methods/:id/toggle`
- `DELETE /api/v1/payment-methods/:id`

### Floors & Tables
- `GET /api/v1/floors` (nested tables)
- `POST /api/v1/floors`
- `POST /api/v1/floors/:id/tables`
- `PATCH /api/v1/tables/:id`
- `DELETE /api/v1/tables/:id`

### POS Sessions
- `GET /api/v1/sessions/current`
- `POST /api/v1/sessions/open`
- `POST /api/v1/sessions/:id/close`

### Customers
- `GET /api/v1/customers?search=`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`

### Coupons
- `GET /api/v1/coupons`
- `POST /api/v1/coupons`
- `PATCH /api/v1/coupons/:id`
- `DELETE /api/v1/coupons/:id`
- `POST /api/v1/coupons/validate`

### Promotions
- `GET /api/v1/promotions`
- `POST /api/v1/promotions`
- `PATCH /api/v1/promotions/:id`
- `DELETE /api/v1/promotions/:id`

### Orders
- `GET /api/v1/orders?session_id=&search=&status=`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id`
- `DELETE /api/v1/orders/:id` (draft only)
- `POST /api/v1/orders/:id/items`
- `PATCH /api/v1/orders/:id/items/:item_id`
- `DELETE /api/v1/orders/:id/items/:item_id`
- `POST /api/v1/orders/:id/coupon`
- `POST /api/v1/orders/:id/send-to-kitchen`
- `POST /api/v1/orders/:id/payments`
- `GET /api/v1/orders/:id/receipt?delivery=email|print`

### Kitchen Display
- `WS /ws/kds`
- `GET /api/v1/kds/tickets?stage=&category=&product=`
- `PATCH /api/v1/order-items/:id/status`
- `PATCH /api/v1/orders/:id/kds-stage`

### Customer Facing Display
- `WS /ws/customer-display/:session_id`
- `GET /api/v1/customer-display/:session_id/state`

### Self Ordering / Mobile
- `GET /api/v1/self-ordering/settings`
- `PATCH /api/v1/self-ordering/settings`
- `GET /api/v1/self-ordering/qr-codes` (PDF/image batch)
- `GET /api/v1/s/:token` (resolve table from token)
- `GET /api/v1/s/:token/products`
- `POST /api/v1/s/:token/orders`
- `POST /api/v1/s/:token/orders/:order_id/items`
- `POST /api/v1/s/:token/orders/:order_id/coupon`
- `POST /api/v1/s/:token/orders/:order_id/place`
- `GET /api/v1/s/:token/orders` (order history for that token)
- `WS /ws/self-order/:order_id` (live status tracking)

### Reports
- `GET /api/v1/reports/summary?period=&employee=&session=&product=`
- `GET /api/v1/reports/sales-trend`
- `GET /api/v1/reports/top-categories`
- `GET /api/v1/reports/top-orders`
- `GET /api/v1/reports/top-products`
- `GET /api/v1/reports/export?format=pdf|xls`

**Endpoint count: ~50 REST endpoints + 3 WebSocket channels.**

---

## 3. FEATURES TO BE IMPLEMENTED (functional logic from annotations)

### Auth & Session
- [ ] On successful login, skip any dashboard — go straight into the POS session screen
- [ ] Session screen surfaces last session's open date + closing sale amount

### Order View / Cart
- [ ] Product cards inherit their category's color live (color edits propagate without refresh)
- [ ] Category filter tabs + live product-name search
- [ ] Quantity +/− stepper directly on cart lines
- [ ] "Send to Kitchen" pushes the order to KDS in real time
- [ ] Product-level promotion discount renders inline on its specific cart line
- [ ] Order-level discount/coupon renders as its own summary line (Subtotal / Tax / Discount / Total)
- [ ] Numeric keypad component reused for quantity and payment amount entry
- [ ] Payment panel only lists methods currently enabled in Backend
- [ ] UPI payment dynamically generates QR from the saved UPI ID + live order amount
- [ ] Card payment requires a transaction reference; Cash shows change-due calculation

### Orders & Tables
- [ ] Orders list searchable by customer name / order number / date
- [ ] Draft orders: Delete + Edit Order both visible; Paid orders: view-only
- [ ] "Edit Order" redirects into the Cart with that draft pre-loaded
- [ ] Table View / Floor Pop-up visually distinguishes tables with active orders from free ones
- [ ] Selecting a table opens/loads that table's order

### Customers
- [ ] Inline create/search/edit/delete from within the POS terminal
- [ ] Selected customer auto-attaches to the order; their email pre-fills the receipt popup

### Backend — Products & Categories
- [ ] Product list supports bulk select → Delete or Archive
- [ ] Category can be created **on the fly** from inside the Product form (no navigation away)
- [ ] Category list is an inline-editable grid — "New" appends an editable row directly
- [ ] Category color picker; color change propagates everywhere live (product cards, tabs, KDS filters)
- [ ] Tax field is a fixed dropdown of standard slabs (e.g. 5% / 12% / 18% / 28%)

### Backend — Payment Methods
- [ ] Per-method enable/disable toggle
- [ ] UPI method requires a UPI ID; form renders a live QR preview the instant Type = UPI is chosen

### Backend — Coupon & Promotion
- [ ] One unified list distinguishes Coupon vs Automated Promotion, shows active-programme count
- [ ] Coupon: free-text code + % or fixed discount, redeemed manually in POS
- [ ] Automated Promotion (Product): triggers at a configured Minimum Quantity
- [ ] Automated Promotion (Order): triggers at a configured Minimum Order Amount
- [ ] Both promotion types discount the **whole order**, not just the triggering line
- [ ] When multiple automated promotions qualify, POS shows a selector popup (e.g. "30% vs 25% Discount") for the employee to choose

### User/Employee
- [ ] List filterable by Type (User/Employee) and Status
- [ ] Row actions: Delete, Archive, Change Password
- [ ] Archive deactivates without deleting the record

### Customer Facing Display
- [ ] Reached by appending `/customer-display` to the base URL
- [ ] Left side: fixed welcome/store message. Right side: dynamic panel driven live by cashier actions
- [ ] Three live states: Order View → Payment View (UPI QR) → Completion View — pushed in real time, not polled

### Self Ordering (Admin Config)
- [ ] Master toggle gates visibility of all sub-settings
- [ ] Mode radio: Online Ordering (full cart) vs QR Menu (digital menu only, no checkout)
- [ ] Background: multi-image upload + color picker
- [ ] Online Ordering mode exposes Payment Method section — "Pay at counter" only, enabled by default and read-only (no live gateway in this version)
- [ ] Preview Webpage + Download QR Code shortcuts inside settings
- [ ] One QR auto-generated per active table, each encoding a unique token → `domain.com/s/<token>`
- [ ] "Download QR Code" bundles all table QR codes into one printable PDF

### Self Ordering (Customer Mobile Flow)
- [ ] Scanned QR opens a no-login mobile web app pre-bound to that table via the token
- [ ] Splash → Browse (category tabs, search, qty badge) → Product Detail (variant + addons + qty) → Cart/Payment (coupon entry, totals) → Confirmed → Order History
- [ ] Order History pulls live status directly from KDS (To Cook/Preparing/Completed)
- [ ] Self-Ordering orders auto-route into KDS exactly like POS-originated orders

### Kitchen Display System
- [ ] Fixed bookmarkable URL for a dedicated kitchen device/tab
- [ ] Three columns (To Cook / Preparing / Completed) each with a live count badge
- [ ] Ticket number = originating Order Number
- [ ] Clicking a ticket card advances the **whole order** to the next stage
- [ ] Clicking a single item strikes it through and marks it done **independent of** the ticket's overall stage
- [ ] Sidebar: Clear Filter + filter by Category and by Product; top search bar
- [ ] Only products flagged "KDS visible" ever appear here

### Reports / Dashboard
- [ ] Filters: date range, Employee, Session, Product — everything updates live on change
- [ ] KPI cards: Total Orders, Revenue, Average Order Value
- [ ] Sales Trend line chart + Top Selling Category pie chart
- [ ] Top Orders / Top Product / Top Category tables
- [ ] Export current view as PDF or XLS

### Cross-Cutting
- [ ] **Real-time sync backbone**: category color edits, payment-method toggles, order/payment state, and KDS ticket movement must all broadcast live to every open screen (POS Terminal, KDS, Customer Display, Self-Order tracker) — no manual refresh anywhere in the system.

---

## 4. OPEN QUESTIONS / GAPS TO CONFIRM WITH THE BOARD OWNER

1. **Floor & Table backend CRUD** — the board shows the table-grid *picker* (used inside the POS Floor Pop-up and Table View) but no distinct admin screen with fields for Table Number / Seats / Active toggle, even though "Booking" is listed in the hamburger nav. Confirm whether admins manage tables from a dedicated CRUD page or directly inside that same grid (e.g., click an empty cell to create a table).
2. **Order Detail button logic** — one wireframe card pairs a "Paid" status with a Delete button and a "Draft" status with an Edit Order button, which reads inconsistent with the annotation text ("Delete only visible if Draft"). I've implemented it per the annotation rule (Draft = Delete + Edit Order, Paid = view-only) — flag if the board intended otherwise.
3. **Self-Ordering payment** — only "Pay at counter" is shown, and it's read-only/default-enabled. Confirm there's no online payment gateway in scope for this version, or whether that's a placeholder for a future card/UPI option.

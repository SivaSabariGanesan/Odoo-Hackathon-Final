-- =============================================================================
-- CAFE POS — Indexes & Check Constraints
-- Run AFTER drizzle-kit push/migrate has created the base tables.
-- Safe to re-run (all use CREATE INDEX IF NOT EXISTS / ADD CONSTRAINT IF NOT EXISTS).
-- =============================================================================

-- ─── staff_accounts ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_email         ON staff_accounts (email);
CREATE INDEX IF NOT EXISTS idx_staff_role          ON staff_accounts (role);
CREATE INDEX IF NOT EXISTS idx_staff_status        ON staff_accounts (status);
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at    ON staff_accounts (deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE staff_accounts
  ADD CONSTRAINT chk_staff_pin_length CHECK (pin IS NULL OR length(pin) = 6);

-- ─── product_categories ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories (is_active);

ALTER TABLE product_categories
  ADD CONSTRAINT chk_category_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- ─── products ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category        ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_available       ON products (is_available) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at      ON products (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_name_search     ON products USING gin(to_tsvector('english', name));

ALTER TABLE products
  ADD CONSTRAINT chk_product_price     CHECK (price >= 0),
  ADD CONSTRAINT chk_product_tax_rate  CHECK (tax_rate >= 0 AND tax_rate <= 100);

-- ─── payment_methods ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_methods_enabled ON payment_methods (is_enabled);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type    ON payment_methods (type);

-- ─── floors ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_floors_active ON floors (is_active);

-- ─── floor_tables ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_floor_tables_floor_id ON floor_tables (floor_id);
CREATE INDEX IF NOT EXISTS idx_floor_tables_state    ON floor_tables (state);
CREATE INDEX IF NOT EXISTS idx_floor_tables_qr_token ON floor_tables (qr_token);
CREATE INDEX IF NOT EXISTS idx_floor_tables_active   ON floor_tables (is_active) WHERE is_active = TRUE;

ALTER TABLE floor_tables
  ADD CONSTRAINT chk_table_seats CHECK (seats > 0);

-- ─── customers ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers (deleted_at) WHERE deleted_at IS NULL;

-- ─── promotions ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_promotions_coupon_code ON promotions (coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_status      ON promotions (status);
CREATE INDEX IF NOT EXISTS idx_promotions_expires_at  ON promotions (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE promotions
  ADD CONSTRAINT chk_promotion_discount   CHECK (discount_value >= 0),
  ADD CONSTRAINT chk_promotion_used_count CHECK (used_count >= 0),
  ADD CONSTRAINT chk_promotion_max_uses   CHECK (max_uses IS NULL OR max_uses > 0);

-- ─── pos_sessions ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_by ON pos_sessions (opened_by_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status    ON pos_sessions (status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON pos_sessions (opened_at DESC);

ALTER TABLE pos_sessions
  ADD CONSTRAINT chk_session_opening_cash CHECK (opening_cash >= 0);

-- ─── orders ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_session_id    ON orders (session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id      ON orders (table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_staff_id      ON orders (staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_source        ON orders (source);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at       ON orders (paid_at DESC) WHERE paid_at IS NOT NULL;
-- Reporting composite: daily revenue queries
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON orders (status, paid_at DESC);

ALTER TABLE orders
  ADD CONSTRAINT chk_order_subtotal    CHECK (subtotal >= 0),
  ADD CONSTRAINT chk_order_tax         CHECK (tax_amount >= 0),
  ADD CONSTRAINT chk_order_discount    CHECK (discount_amount >= 0),
  ADD CONSTRAINT chk_order_grand_total CHECK (grand_total >= 0);

-- ─── order_items ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_state ON order_items (kitchen_state);

ALTER TABLE order_items
  ADD CONSTRAINT chk_item_quantity   CHECK (quantity > 0),
  ADD CONSTRAINT chk_item_unit_price CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_item_tax_rate   CHECK (tax_rate >= 0 AND tax_rate <= 100);

-- ─── payments ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_order_id  ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_id ON payments (method_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at   ON payments (paid_at DESC) WHERE paid_at IS NOT NULL;

ALTER TABLE payments
  ADD CONSTRAINT chk_payment_amount CHECK (amount > 0),
  ADD CONSTRAINT chk_payment_change CHECK (change_amount >= 0);

-- ─── receipts ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_receipts_order_id       ON receipts (order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts (receipt_number);

-- ─── kitchen_tickets ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order_id  ON kitchen_tickets (order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status    ON kitchen_tickets (status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_created_at ON kitchen_tickets (created_at DESC);
-- Hot-path query: fetch all non-completed tickets for KDS
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_active ON kitchen_tickets (status, created_at)
  WHERE status IN ('PENDING', 'IN_PROGRESS');

-- ─── kitchen_ticket_items ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kti_ticket_id    ON kitchen_ticket_items (ticket_id);
CREATE INDEX IF NOT EXISTS idx_kti_order_item_id ON kitchen_ticket_items (order_item_id);
CREATE INDEX IF NOT EXISTS idx_kti_state        ON kitchen_ticket_items (state);

-- ─── customer_display_sessions ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cds_terminal_id ON customer_display_sessions (terminal_id);
CREATE INDEX IF NOT EXISTS idx_cds_online      ON customer_display_sessions (is_online) WHERE is_online = TRUE;

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_actor_id    ON audit_logs (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_logs (created_at DESC);

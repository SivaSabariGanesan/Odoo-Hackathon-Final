-- Reset test order for payment testing
-- Run this when you need to test payments again on the same order

-- Update the order status back to READY
UPDATE orders 
SET status = 'READY', 
    paid_at = NULL,
    updated_at = NOW()
WHERE public_id = '4e87ba25-ee88-4f34-afeb-4e4fea6a1664';

-- Optional: Clear previous payment attempts for this order
-- Uncomment if you want to completely reset payment history
-- DELETE FROM payments WHERE order_id = (SELECT id FROM orders WHERE public_id = '4e87ba25-ee88-4f34-afeb-4e4fea6a1664');
-- DELETE FROM payment_transactions WHERE order_id = (SELECT id FROM orders WHERE public_id = '4e87ba25-ee88-4f34-afeb-4e4fea6a1664');
-- DELETE FROM receipts WHERE order_id = (SELECT id FROM orders WHERE public_id = '4e87ba25-ee88-4f34-afeb-4e4fea6a1664');

SELECT 'Order reset successfully' as message;

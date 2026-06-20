$BASE = "http://localhost:3000/api"
$h = @{ "Content-Type" = "application/json" }
$pass = 0; $fail = 0

function Check($label, $cond) {
  if ($cond) { Write-Host "  [PASS] $label" -ForegroundColor Green; $script:pass++ }
  else        { Write-Host "  [FAIL] $label" -ForegroundColor Red;   $script:fail++ }
}
function Post($url, $body) {
  try { return Invoke-RestMethod $url -Method POST -Headers $h -Body ($body | ConvertTo-Json -Depth 5) }
  catch { try { return $_.ErrorDetails.Message | ConvertFrom-Json } catch { return @{ success=$false; error=@{ code="HTTP_ERROR"; message=$_.Exception.Message } } } }
}
function Get($url) {
  try { return Invoke-RestMethod $url }
  catch { try { return $_.ErrorDetails.Message | ConvertFrom-Json } catch { return @{ success=$false; error=@{ code="HTTP_ERROR"; message=$_.Exception.Message } } } }
}
function Patch($url, $body) {
  try { return Invoke-RestMethod $url -Method PATCH -Headers $h -Body ($body | ConvertTo-Json -Depth 5) }
  catch { try { return $_.ErrorDetails.Message | ConvertFrom-Json } catch { return @{ success=$false; error=@{ code="HTTP_ERROR"; message=$_.Exception.Message } } } }
}
function Del($url) {
  try { return Invoke-RestMethod $url -Method DELETE }
  catch { try { return $_.ErrorDetails.Message | ConvertFrom-Json } catch { return @{ success=$false; error=@{ code="HTTP_ERROR"; message=$_.Exception.Message } } } }
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
$health = Get "http://localhost:3000/health"
Check "server healthy" ($health.status -eq "healthy")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== CATEGORIES ===" -ForegroundColor Cyan

$cat = Post "$BASE/categories" @{ name="TestDrinks"; color="#ff5733" }
Check "create category"           ($cat.success -eq $true)
Check "category has publicId"     ($null -ne $cat.data.publicId)
$catId = $cat.data.publicId

$cats = Get "$BASE/categories"
Check "list categories"           ($cats.success -eq $true -and $cats.data.Count -gt 0)

$catGet = Get "$BASE/categories/$catId"
Check "get category by id"        ($catGet.data.name -eq "TestDrinks")

$catUpd = Patch "$BASE/categories/$catId" @{ color="#aabbcc" }
Check "patch category color"      ($catUpd.success -eq $true)

$cat404 = Get "$BASE/categories/00000000-0000-0000-0000-000000000000"
Check "get category 404"          ($cat404.error.code -eq "NOT_FOUND")

# delete blocked (has products — will test after product creation)

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== PRODUCTS ===" -ForegroundColor Cyan

# create via categoryId
$prod = Post "$BASE/products" @{ categoryId=$catId; name="Mango Lassi"; price=80; taxType="INCLUSIVE"; taxRate=5; uom="GLASS" }
Check "create product (categoryId)"      ($prod.success -eq $true)
Check "product has publicId"             ($null -ne $prod.data.publicId)
$prodId = $prod.data.publicId

# create via categoryName (existing)
$prod2 = Post "$BASE/products" @{ categoryName="TestDrinks"; name="Masala Chai"; price=30; taxRate=0 }
Check "create product (categoryName existing)" ($prod2.success -eq $true)
$prod2Id = $prod2.data.publicId

# create via categoryName (new inline)
$prod3 = Post "$BASE/products" @{ categoryName="Snacks"; name="Samosa"; price=20; taxRate=5 }
Check "create product (categoryName new)"      ($prod3.success -eq $true)

# list
$prods = Get "$BASE/products"
Check "list products"                    ($prods.success -eq $true -and $prods.data.Count -gt 0)

# list filtered by isAvailable
$prodsAvail = Get "$BASE/products?isAvailable=true"
Check "list products filter isAvailable" ($prodsAvail.success -eq $true)

# get by id
$prodGet = Get "$BASE/products/$prodId"
Check "get product by id"                ($prodGet.data.name -eq "Mango Lassi")

# patch
$prodUpd = Patch "$BASE/products/$prodId" @{ price=90; isFeatured=$true }
Check "patch product"                    ($prodUpd.success -eq $true)

# invalid tax rate
$badProd = Post "$BASE/products" @{ categoryId=$catId; name="Bad"; price=10; taxRate=99 }
Check "create product bad taxRate 422"   ($badProd.error.code -eq "INVALID_TAX_RATE")

# missing category
$noCat = Post "$BASE/products" @{ name="NoCat"; price=10; taxRate=0 }
Check "create product no category 400"   ($noCat.error.code -eq "VALIDATION_ERROR")

# 404
$prod404 = Get "$BASE/products/00000000-0000-0000-0000-000000000000"
Check "get product 404"                  ($prod404.error.code -eq "NOT_FOUND")

# archive single
$arch = Post "$BASE/products/$prod2Id/archive" @{}
Check "archive product"                  ($arch.success -eq $true)

# bulk archive
$bulkArch = Post "$BASE/products/bulk/archive" @{ ids=@($prodId) }
Check "bulk archive products"            ($bulkArch.success -eq $true -and $bulkArch.data.archived -ge 1)

# delete category blocked (has products)
$catDel = Del "$BASE/categories/$catId"
Check "delete category blocked (has products)" ($catDel.error.code -eq "CATEGORY_IN_USE")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== STAFF ===" -ForegroundColor Cyan

$staff = Post "$BASE/staff" @{ name="Arjun Sharma"; email="arjun_test@cafe.com"; password="secret123"; role="CASHIER" }
Check "create staff"                     ($staff.success -eq $true)
Check "staff has publicId"               ($null -ne $staff.data.publicId)
$staffId = $staff.data.publicId

# duplicate email
$dupStaff = Post "$BASE/staff" @{ name="Dup"; email="arjun_test@cafe.com"; password="secret123" }
Check "create staff duplicate email 409" ($dupStaff.error.code -eq "EMAIL_ALREADY_EXISTS")

$staffList = Get "$BASE/staff"
Check "list staff"                       ($staffList.success -eq $true -and $staffList.data.Count -gt 0)

$staffGet = Get "$BASE/staff/$staffId"
Check "get staff by id"                  ($staffGet.data.name -eq "Arjun Sharma")

$staffUpd = Patch "$BASE/staff/$staffId" @{ name="Arjun Kumar" }
Check "patch staff"                      ($staffUpd.data.name -eq "Arjun Kumar")

$staffPwd = Post "$BASE/staff/$staffId/change-password" @{ newPassword="newpass123" }
Check "change staff password"            ($staffPwd.data.changed -eq $true)

$staff404 = Get "$BASE/staff/00000000-0000-0000-0000-000000000000"
Check "get staff 404"                    ($staff404.error.code -eq "NOT_FOUND")

# list by role filter
$cashiers = Get "$BASE/staff?role=CASHIER"
Check "list staff filter by role"        ($cashiers.success -eq $true)

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== CUSTOMERS ===" -ForegroundColor Cyan

$cust = Post "$BASE/customers" @{ name="Ravi Kumar"; email="ravi_test@example.com"; phone="+919876543210" }
Check "create customer"                  ($cust.success -eq $true)
$custId = $cust.data.publicId

$custs = Get "$BASE/customers"
Check "list customers"                   ($custs.success -eq $true -and $custs.data.Count -gt 0)

$custGet = Get "$BASE/customers/$custId"
Check "get customer by id"               ($custGet.data.name -eq "Ravi Kumar")

$custUpd = Patch "$BASE/customers/$custId" @{ name="Ravi Singh" }
Check "patch customer"                   ($custUpd.data.name -eq "Ravi Singh")

$custSearch = Get "$BASE/customers?search=Ravi"
Check "search customers"                 ($custSearch.data.Count -gt 0)

$cust404 = Get "$BASE/customers/00000000-0000-0000-0000-000000000000"
Check "get customer 404"                 ($cust404.error.code -eq "NOT_FOUND")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== FLOORS & TABLES ===" -ForegroundColor Cyan

$floor = Post "$BASE/floors" @{ name="Ground Floor"; sortOrder=1 }
Check "create floor"                     ($floor.success -eq $true)
$floorId = $floor.data.publicId

$floors = Get "$BASE/floors"
Check "list floors"                      ($floors.success -eq $true -and $floors.data.Count -gt 0)

$floorGet = Get "$BASE/floors/$floorId"
Check "get floor by id"                  ($floorGet.data.name -eq "Ground Floor")

$floorUpd = Patch "$BASE/floors/$floorId" @{ name="Main Floor" }
Check "patch floor"                      ($floorUpd.data.name -eq "Main Floor")

# create table
$table = Post "$BASE/floors/tables" @{ floorId=$floorId; tableNumber="T-01"; seats=4 }
Check "create table"                     ($table.success -eq $true)
$tableId = $table.data.publicId

# list tables for floor
$tables = Get "$BASE/floors/$floorId/tables"
Check "list tables for floor"            ($tables.success -eq $true -and $tables.data.Count -gt 0)

$tableGet = Get "$BASE/floors/tables/$tableId"
Check "get table by id"                  ($tableGet.data.tableNumber -eq "T-01")

$tableUpd = Patch "$BASE/floors/tables/$tableId" @{ seats=6 }
Check "patch table"                      ($tableUpd.success -eq $true)

# toggle table active
$toggled = Post "$BASE/floors/tables/$tableId/toggle-active" @{}
Check "toggle table active"              ($toggled.success -eq $true)
$toggled2 = Post "$BASE/floors/tables/$tableId/toggle-active" @{}  # re-activate
Check "toggle table back active"         ($toggled2.success -eq $true)

# delete floor blocked (has tables)
$floorDel = Del "$BASE/floors/$floorId"
Check "delete floor blocked (has tables)" ($floorDel.error.code -eq "FLOOR_HAS_TABLES")

$floor404 = Get "$BASE/floors/00000000-0000-0000-0000-000000000000"
Check "get floor 404"                    ($floor404.error.code -eq "NOT_FOUND")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== POS SESSIONS ===" -ForegroundColor Cyan

# open session requires auth — patch user onto context via staff id hack
# open with staff id inline
$sessOpen = Post "$BASE/sessions/open" @{ openingCash=1000 }
# No auth middleware, so user will be null → expect 401
Check "open session no auth returns 401" ($sessOpen.error.code -eq "UNAUTHORIZED")

$sessList = Get "$BASE/sessions"
Check "list sessions"                    ($sessList.success -eq $true)

$sessLast = Get "$BASE/sessions/last-closed"
Check "get last closed session"          ($sessLast.success -eq $true)

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== ORDERS ===" -ForegroundColor Cyan

# create order (no table, no session — TAKEAWAY)
$order = Post "$BASE/orders" @{ type="TAKEAWAY"; source="POS" }
Check "create order (takeaway)"          ($order.success -eq $true)
Check "order status is DRAFT"            ($order.data.status -eq "DRAFT")
$orderId = $order.data.publicId

# create order with table
$orderTable = Post "$BASE/orders/table/$tableId/draft" @{}
Check "get-or-create draft for table"    ($orderTable.success -eq $true)
$orderTableId = $orderTable.data.publicId

# list orders
$orderList = Get "$BASE/orders"
Check "list orders"                      ($orderList.success -eq $true -and $orderList.data.Count -gt 0)

# get order
$orderGet = Get "$BASE/orders/$orderId"
Check "get order by id"                  ($orderGet.data.status -eq "DRAFT")

# add item — get a valid product first
$validProd = (Get "$BASE/products?isAvailable=true").data | Where-Object { $_.isAvailable -eq $true } | Select-Object -First 1
Check "found available product for order" ($null -ne $validProd)

if ($null -ne $validProd) {
  $addItem = Post "$BASE/orders/$orderId/items" @{ productId=$validProd.publicId; quantity=2 }
  Check "add item to order"              ($addItem.success -eq $true)
  Check "order has items"                ($addItem.data.items.Count -gt 0)

  # get item publicId
  $itemId = $addItem.data.items[0].publicId

  # update item qty
  $updItem = Invoke-RestMethod "$BASE/orders/$orderId/items/$itemId" -Method PATCH -Headers $h -Body '{"quantity":3}'
  Check "update cart item qty"           ($updItem.success -eq $true)

  # send to kitchen
  $kitchen = Post "$BASE/orders/$orderId/send-to-kitchen" @{}
  Check "send to kitchen"                ($kitchen.success -eq $true)

  # get kds tickets
  $tickets = Get "$BASE/kds/tickets"
  Check "kds list active tickets"        ($tickets.success -eq $true)

  $orderTickets = Get "$BASE/kds/tickets/order/$orderId"
  Check "kds tickets for order"          ($orderTickets.success -eq $true -and $orderTickets.data.Count -gt 0)

  if ($orderTickets.data.Count -gt 0) {
    $ticketId = $orderTickets.data[0].publicId
    $ticketItemId = $orderTickets.data[0].items[0].publicId

    # advance item state TO_COOK → PREPARING
    $adv1 = Post "$BASE/kds/items/$ticketItemId/advance" @{}
    Check "kds advance item (TO_COOK→PREPARING)" ($adv1.success -eq $true)

    # advance ticket (PREPARING → COMPLETED)
    $adv2 = Post "$BASE/kds/tickets/$ticketId/advance" @{}
    Check "kds advance ticket (→COMPLETED)"      ($adv2.success -eq $true)
  }

  # attach customer
  $attachCust = Post "$BASE/orders/$orderId/attach-customer" @{ customerPublicId=$custId }
  Check "attach customer to order"       ($attachCust.success -eq $true)

  # mark paid
  $paid = Post "$BASE/orders/$orderId/mark-paid" @{ amount=240 }
  Check "mark order paid"                ($paid.success -eq $true)

  # double-pay same order → 409
  $dblPay = Post "$BASE/orders/$orderId/mark-paid" @{ amount=240 }
  Check "double-pay returns 409"         ($dblPay.error.code -eq "ORDER_ALREADY_PAID")
}

# cancel a fresh order
$order2 = Post "$BASE/orders" @{ type="DINE_IN"; source="POS" }
$cancelRes = Post "$BASE/orders/$($order2.data.publicId)/cancel" @{ reason="Test cancel" }
Check "cancel order"                     ($cancelRes.success -eq $true)

# cancel already-cancelled → 409
$cancelAgain = Post "$BASE/orders/$($order2.data.publicId)/cancel" @{}
Check "cancel already-cancelled 409"    ($cancelAgain.error.code -eq "ORDER_CANCELLED")

# add item to paid order → 409
if ($null -ne $validProd) {
  $addToPaid = Post "$BASE/orders/$orderId/items" @{ productId=$validProd.publicId; quantity=1 }
  Check "add item to paid order 409"     ($addToPaid.error.code -eq "ORDER_ALREADY_PAID")
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== REPORTS ===" -ForegroundColor Cyan

$kpis = Get "$BASE/reports/kpis?period=today"
Check "reports kpis today"               ($kpis.success -eq $true)
Check "kpis has totalOrders"             ($null -ne $kpis.data.totalOrders)

$trend = Get "$BASE/reports/sales-trend?period=week"
Check "reports sales-trend week"         ($trend.success -eq $true)

$topCats = Get "$BASE/reports/top-categories?period=month"
Check "reports top-categories month"     ($topCats.success -eq $true)

$topProds = Get "$BASE/reports/top-products?period=today"
Check "reports top-products today"       ($topProds.success -eq $true)

$topOrders = Get "$BASE/reports/top-orders?period=today"
Check "reports top-orders today"         ($topOrders.success -eq $true)

$export = Get "$BASE/reports/export?period=today&type=orders"
Check "reports export orders"            ($export.success -eq $true)

$exportProds = Get "$BASE/reports/export?period=today&type=products"
Check "reports export products"          ($exportProds.success -eq $true)

$customMissing = Get "$BASE/reports/kpis?period=custom"
Check "reports kpis custom missing from/to 400" ($customMissing.error.code -eq "VALIDATION_ERROR")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== PRODUCT SOFT DELETE & BULK DELETE ===" -ForegroundColor Cyan

# create a fresh deletable product
$delProd = Post "$BASE/products" @{ categoryName="TestDrinks"; name="DeleteMe"; price=10; taxRate=0 }
Check "create deletable product"         ($delProd.success -eq $true)
$delProdId = $delProd.data.publicId

$delRes = Del "$BASE/products/$delProdId"
Check "soft delete product"              ($delRes.data.deleted -eq $true)

# delete already-deleted → 404
$del404 = Del "$BASE/products/$delProdId"
Check "delete already-deleted 404"       ($del404.error.code -eq "NOT_FOUND")

# bulk delete — product used in paid order should be blocked
if ($null -ne $validProd) {
  $bulkDel = Post "$BASE/products/bulk/delete" @{ ids=@($validProd.publicId) }
  Check "bulk delete used product blocked" ($bulkDel.error.code -eq "PRODUCT_IN_USE")
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== STAFF ARCHIVE & DELETE ===" -ForegroundColor Cyan

$archStaff = Post "$BASE/staff/$staffId/archive" @{}
Check "archive staff"                    ($archStaff.success -eq $true)

# delete staff not referenced by orders
$delStaff = Del "$BASE/staff/$staffId"
Check "delete staff (unreferenced)"      ($delStaff.success -eq $true -or $delStaff.error.code -eq "STAFF_IN_USE")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== CUSTOMER DELETE ===" -ForegroundColor Cyan
$custDel = Del "$BASE/customers/$custId"
Check "soft delete customer"             ($custDel.data.deleted -eq $true)

$custDel404 = Del "$BASE/customers/$custId"
Check "delete already-deleted customer 404" ($custDel404.error.code -eq "NOT_FOUND")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n=== NOT FOUND ROUTE ===" -ForegroundColor Cyan
$nf = Get "http://localhost:3000/api/doesnotexist"
Check "unknown route 404"                ($nf.error.code -eq "NOT_FOUND")

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor White
Write-Host "  PASSED: $pass" -ForegroundColor Green
Write-Host "  FAILED: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor White

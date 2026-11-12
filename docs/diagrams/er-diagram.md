# ER diagram

The 13 tables from blueprint 5.2, exactly as `database/migrations/001_schema.sql` creates
them. GitHub and most editors render the Mermaid block below; no external tool is needed.

♻ marks a table with `deleted_at` (soft delete, FR-23). `auth.users` belongs to Supabase
Auth and is shown for the relationships only.

```mermaid
erDiagram
  auth_users ||--|| profiles : "1-1"
  profiles ||--o{ addresses : "owns"
  profiles ||--o{ orders : "places"
  profiles ||--o{ announcements : "authors"
  profiles ||--|| conversations : "opens"
  profiles ||--o{ push_subscriptions : "subscribes"
  categories ||--o{ products : "groups"
  products ||--o{ order_items : "ordered as"
  products ||--o{ inventory_logs : "logged for"
  orders ||--o{ order_items : "contains"
  orders ||--|| payments : "paid by"
  conversations ||--o{ messages : "holds"

  auth_users {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }

  profiles {
    uuid id PK "FK auth.users"
    text full_name
    text phone
    text role "customer | staff | admin"
    boolean is_active
  }

  addresses {
    uuid id PK
    uuid user_id FK
    text street
    text barangay
    text municipality
    text province
    float latitude
    float longitude
    boolean is_default
    timestamptz deleted_at "soft delete"
  }

  categories {
    uuid id PK
    text name UK
    text description
    timestamptz deleted_at "soft delete"
  }

  products {
    uuid id PK
    uuid category_id FK
    text name
    text description
    text brand
    text unit
    numeric price
    int stock_qty
    int reorder_level
    text image_url
    boolean is_featured
    timestamptz deleted_at "soft delete"
  }

  inventory_logs {
    uuid id PK
    uuid product_id FK
    uuid user_id FK "who moved the stock"
    int change_qty "signed"
    text reason "stock-in | sale | adjustment | spoilage"
  }

  orders {
    uuid id PK
    uuid user_id FK
    uuid address_id FK "null for pickup"
    text fulfillment_type "delivery | pickup"
    numeric delivery_fee
    numeric total_amount
    text status "pending | paid | preparing | out_for_delivery | completed | cancelled"
    boolean stock_deducted "guards deduct_stock"
  }

  order_items {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    numeric unit_price "price at purchase"
    numeric subtotal
  }

  payments {
    uuid id PK
    uuid order_id FK "one per order"
    text method "gcash | card | grab_pay | cod"
    text paymongo_ref UK "payment intent id"
    numeric amount
    text status "pending | paid | failed"
    timestamptz paid_at
  }

  announcements {
    uuid id PK
    uuid author_id FK
    text title
    text body
    boolean is_pinned
    timestamptz published_at "null = draft"
    timestamptz deleted_at "soft delete"
  }

  site_content {
    text key PK "home_hero | home_banners | about | contact | store_location | delivery_rates"
    jsonb value
    timestamptz updated_at
  }

  push_subscriptions {
    uuid id PK
    uuid user_id FK
    text endpoint UK "one row per browser"
    text p256dh
    text auth
  }

  conversations {
    uuid id PK
    uuid customer_id FK "one per customer"
    timestamptz last_message_at
  }

  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK
    text body
  }
```

Notes that the diagram cannot show:

- **RLS is on for all 13 tables**, and every policy is scoped `to authenticated`, so the
  anonymous key reads nothing at all (`database/tests/rls.test.mjs`). The API uses the
  service role, which bypasses RLS.
- **Indexes** (blueprint 5.2, deliberately no more): `products(category_id)`,
  `orders(user_id, status)`, `inventory_logs(product_id)`,
  `messages(conversation_id, created_at)`.
- **Orders are never deleted**, they are cancelled; **users are deactivated**
  (`is_active = false`), not deleted. Soft delete covers products, categories,
  announcements and addresses.
- `order_items.unit_price` and `order_items.subtotal` are stored because a product's price
  can change after the sale; `orders.stock_deducted` is what makes `deduct_stock`
  idempotent against PayMongo retries.

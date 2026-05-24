<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $this->upSqlite();
        } elseif ($driver === 'pgsql') {
            $this->upPostgres();
        } else {
            throw new \RuntimeException("convert_categories_to_integer_ids: unsupported driver [{$driver}]");
        }
    }

    public function down(): void
    {
        // Irreversible in dev — just re-run migrate:fresh
    }

    private function upSqlite(): void
    {
        // ── 1. Drop the existing FK and old tables, recreate with integer PKs ──
        // SQLite doesn't support ALTER COLUMN / DROP CONSTRAINT, so we recreate.

        // Disable FK checks for SQLite
        DB::statement('PRAGMA foreign_keys = OFF');

        // Create new categories table with integer PK + slug
        DB::statement('
            CREATE TABLE categories_new (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                slug     VARCHAR(36) NOT NULL UNIQUE,
                label    VARCHAR     NOT NULL,
                bg       VARCHAR     NOT NULL,
                created_at DATETIME,
                updated_at DATETIME
            )
        ');

        // Copy existing rows; use rowid as new id (SQLite assigns sequential rowids)
        DB::statement('
            INSERT INTO categories_new (slug, label, bg, created_at, updated_at)
            SELECT id, label, bg, created_at, updated_at FROM categories
        ');

        // Temporarily add integer category_id column to products
        DB::statement('ALTER TABLE products ADD COLUMN category_id_new INTEGER REFERENCES categories_new(id)');

        // Map old string category_id → new integer id via the slug
        DB::statement('
            UPDATE products
            SET category_id_new = (
                SELECT categories_new.id FROM categories_new WHERE categories_new.slug = products.category_id
            )
        ');

        // Rebuild products table with the new integer FK
        // Get current products columns
        DB::statement('
            CREATE TABLE products_new AS SELECT * FROM products
        ');
        Schema::drop('products');
        DB::statement('
            CREATE TABLE products (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                slug                VARCHAR NOT NULL UNIQUE,
                brand_id            VARCHAR(36),
                category_id         INTEGER REFERENCES categories_new(id) ON DELETE CASCADE,
                name                VARCHAR NOT NULL,
                name_en             VARCHAR,
                description         TEXT,
                type                VARCHAR,
                is_new              INTEGER DEFAULT 0,
                is_bestseller       INTEGER DEFAULT 0,
                is_offer            INTEGER DEFAULT 0,
                placeholder_bg      VARCHAR,
                placeholder_dot     VARCHAR,
                rating              REAL DEFAULT 0,
                reviews_count       INTEGER DEFAULT 0,
                created_at          DATETIME,
                updated_at          DATETIME
            )
        ');
        DB::statement('
            INSERT INTO products (id, slug, brand_id, category_id, name, name_en, description, type,
                                  is_new, is_bestseller, is_offer, placeholder_bg, placeholder_dot,
                                  rating, reviews_count, created_at, updated_at)
            SELECT id, slug, brand_id, category_id_new, name, name_en, description, type,
                   is_new, is_bestseller, is_offer, placeholder_bg, placeholder_dot,
                   rating, reviews_count, created_at, updated_at
            FROM products_new
        ');
        Schema::drop('products_new');

        // Swap categories tables
        Schema::drop('categories');
        DB::statement('ALTER TABLE categories_new RENAME TO categories');

        DB::statement('PRAGMA foreign_keys = ON');
    }

    private function upPostgres(): void
    {
        // PostgreSQL supports ALTER COLUMN / DROP CONSTRAINT and runs DDL in a
        // transaction, so we can do the conversion in place without table rebuilds.
        // End-state matches the SQLite branch: categories.id BIGSERIAL, slug VARCHAR,
        // products.category_id BIGINT FK to categories.id.

        // 1. Drop the FK from products so we can swap its column type
        DB::statement('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_foreign');

        // 2. Rename the existing string-keyed categories table out of the way
        DB::statement('ALTER TABLE categories RENAME TO categories_old');

        // 3. Create the new integer-keyed categories table
        DB::statement('
            CREATE TABLE categories (
                id BIGSERIAL PRIMARY KEY,
                slug VARCHAR(36) NOT NULL UNIQUE,
                label VARCHAR(255) NOT NULL,
                bg VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL
            )
        ');

        // 4. Copy rows; old string id becomes the slug
        DB::statement('
            INSERT INTO categories (slug, label, bg, created_at, updated_at)
            SELECT id, label, bg, created_at, updated_at FROM categories_old
        ');

        // 5. Add a new integer category_id column on products, mapped via slug
        DB::statement('ALTER TABLE products ADD COLUMN category_id_new BIGINT');
        DB::statement('
            UPDATE products
            SET category_id_new = c.id
            FROM categories c
            WHERE c.slug = products.category_id
        ');

        // 6. Replace the string category_id with the new integer one
        DB::statement('ALTER TABLE products DROP COLUMN category_id');
        DB::statement('ALTER TABLE products RENAME COLUMN category_id_new TO category_id');

        // 7. Reinstate the FK on the new column
        DB::statement('
            ALTER TABLE products
            ADD CONSTRAINT products_category_id_foreign
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        ');

        // 8. Drop the backup of the old categories table
        DB::statement('DROP TABLE categories_old');
    }
};

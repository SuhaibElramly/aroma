<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
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

    public function down(): void
    {
        // Irreversible in dev — just re-run migrate:fresh
    }
};

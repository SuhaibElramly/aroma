<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class ProductFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'query' => 'nullable|string|max:255',
            'category' => 'nullable|integer|exists:categories,id',
            'brand' => 'nullable|string|exists:brands,id',
            'type' => 'nullable|string|in:EDP,EDT,Parfum,EDC',
            'special' => 'nullable|string|in:new,offer,bestseller',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'sort' => 'nullable|string|in:featured,newest,price_asc,price_desc,rating',
            'page' => 'nullable|integer|min:1',
        ];
    }
}

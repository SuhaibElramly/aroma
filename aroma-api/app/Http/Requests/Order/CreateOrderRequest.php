<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity'           => ['required', 'integer', 'min:1'],
            'note'                       => ['nullable', 'string', 'max:500'],
            'is_pickup'                  => ['required', 'boolean'],
            'address_id'                 => ['required_if:is_pickup,false', 'nullable', 'integer', 'exists:addresses,id'],
            'total'                      => ['required', 'numeric', 'min:0.01'],
            'coupon_code'                => ['nullable', 'string'],
        ];
    }
}

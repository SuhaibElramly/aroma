<?php
namespace App\Services;

use App\Models\Address;
use App\Models\User;

class AddressService
{
    public function create(User $user, array $data): Address
    {
        if ($data['is_default'] ?? false) {
            $user->addresses()->update(['is_default' => false]);
        }

        return $user->addresses()->create($data);
    }

    public function update(Address $address, array $data): Address
    {
        if ($data['is_default'] ?? false) {
            $address->user->addresses()->update(['is_default' => false]);
        }

        $address->update($data);
        return $address;
    }
}

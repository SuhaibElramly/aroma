<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\AddressRequest;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use App\Services\AddressService;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function __construct(private AddressService $addressService) {}

    public function index(Request $request)
    {
        return AddressResource::collection($request->user()->addresses);
    }

    public function store(AddressRequest $request)
    {
        $address = $this->addressService->create($request->user(), $request->validated());
        return new AddressResource($address);
    }

    public function update(AddressRequest $request, Address $address)
    {
        $this->authorize('update', $address);
        $address = $this->addressService->update($address, $request->validated());

        return new AddressResource($address);
    }

    public function destroy(Request $request, Address $address)
    {
        $this->authorize('delete', $address);
        $address->delete();

        return response()->json(null, 204);
    }
}

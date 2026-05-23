<?php
namespace App\Enums;

enum PaymentStatus: string
{
    case NotPaid       = 'not_paid';
    case PartiallyPaid = 'partially_paid';
    case Paid          = 'paid';
}

<?php

namespace App\Modules\Orders\Application;

use App\Modules\Payments\Infrastructure\PaymentGateway;

final class Forbidden
{
    public function __construct(private PaymentGateway $gateway)
    {
    }
}

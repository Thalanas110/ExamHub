<?php

namespace App\Modules\Orders\Application;

use App\Modules\Orders\Domain\OrderRepository;

final class Allowed
{
    public function __construct(private OrderRepository $repository)
    {
    }
}

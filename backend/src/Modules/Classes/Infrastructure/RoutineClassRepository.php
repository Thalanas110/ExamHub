<?php

declare(strict_types=1);

namespace App\Modules\Classes\Infrastructure;

use App\Modules\Classes\Domain\ClassRepository;
use App\Shared\Database\RoutineGateway;

final class RoutineClassRepository implements ClassRepository
{
    public function __construct(private RoutineGateway $gateway)
    {
    }

    public function findAll(): array
    {
        return $this->gateway->call('sp_classes_get_all');
    }

    public function findById(string $classId): ?array
    {
        $row = $this->gateway->call('sp_classes_get_by_id', [$classId])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function findByCode(string $code): ?array
    {
        $row = $this->gateway->call('sp_classes_get_by_code', [$code])[0] ?? null;
        return is_array($row) ? $row : null;
    }

    public function create(array $parameters): void
    {
        $this->gateway->call('sp_classes_create', $parameters);
    }

    public function update(array $parameters): void
    {
        $this->gateway->call('sp_classes_update', $parameters);
    }

    public function delete(string $classId): void
    {
        $this->gateway->call('sp_classes_delete', [$classId]);
    }

    public function enrollStudent(string $classId, string $studentId): void
    {
        $this->gateway->call('sp_classes_enroll_student', [$classId, $studentId]);
    }

    public function removeStudent(string $classId, string $studentId): void
    {
        $this->gateway->call('sp_classes_remove_student', [$classId, $studentId]);
    }
}

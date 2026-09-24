<?php

declare(strict_types=1);

namespace App\Modules\Classes\Application;

use App\Modules\Classes\Domain\ClassRepository;
use App\Shared\Support\ValueNormalizer;
use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

final class ClassService
{
    public function __construct(
        private ClassRepository $repository,
        private ClassMapper $mapper,
        private ValueNormalizer $normalizer,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getClasses(): array
    {
        $rows = $this->repository->findAll();
        return array_map(fn (array $row): array => $this->mapper->mapRow($row), $rows);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createClass(array $authUser, array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $subject = trim((string) ($payload['subject'] ?? ''));
        if ($name === '' || $subject === '') {
            throw new ApiException(422, 'name and subject are required.');
        }

        $teacherId = $authUser['role'] === 'teacher'
            ? (string) $authUser['id']
            : (string) ($payload['teacherId'] ?? $authUser['id']);

        $classId = (string) ($payload['id'] ?? Helpers::uuidV4());
        $code = strtoupper(trim((string) ($payload['code'] ?? strtoupper(substr(bin2hex(random_bytes(4)), 0, 6)))));
        $createdAt = $this->normalizer->normalizeDate((string) ($payload['createdAt'] ?? date('Y-m-d')), false);

        $this->repository->create([
            $classId,
            $name,
            $subject,
            $teacherId,
            $code,
            $this->normalizer->nullableString($payload['description'] ?? null),
            $createdAt,
        ]);

        if (isset($payload['studentIds']) && is_array($payload['studentIds'])) {
            foreach ($payload['studentIds'] as $studentId) {
                if (is_string($studentId) && $studentId !== '') {
                    $this->repository->enrollStudent($classId, $studentId);
                }
            }
        }

        return $this->getClassById($classId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateClass(array $authUser, string $classId, array $payload): array
    {
        $existing = $this->getClassById($classId);

        if ($authUser['role'] === 'teacher' && $existing['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only manage their own classes.');
        }

        $name = trim((string) ($payload['name'] ?? $existing['name']));
        $subject = trim((string) ($payload['subject'] ?? $existing['subject']));
        $teacherId = $authUser['role'] === 'teacher'
            ? (string) $authUser['id']
            : (string) ($payload['teacherId'] ?? $existing['teacherId']);

        $code = strtoupper(trim((string) ($payload['code'] ?? $existing['code'])));

        if ($name === '' || $subject === '' || $code === '') {
            throw new ApiException(422, 'name, subject, and code are required.');
        }

        $description = array_key_exists('description', $payload)
            ? $this->normalizer->nullableString($payload['description'])
            : ($existing['description'] ?? null);

        $this->repository->update([
            $classId,
            $name,
            $subject,
            $teacherId,
            $code,
            $description,
        ]);

        if (isset($payload['studentIds']) && is_array($payload['studentIds'])) {
            $target = [];
            foreach ($payload['studentIds'] as $studentId) {
                if (is_string($studentId) && $studentId !== '') {
                    $target[$studentId] = true;
                }
            }

            foreach ($existing['studentIds'] as $studentId) {
                if (!isset($target[$studentId])) {
                    $this->repository->removeStudent($classId, $studentId);
                }
            }

            foreach (array_keys($target) as $studentId) {
                $this->repository->enrollStudent($classId, $studentId);
            }
        }

        return $this->getClassById($classId);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function deleteClass(array $authUser, string $classId): void
    {
        $existing = $this->getClassById($classId);

        if ($authUser['role'] === 'teacher' && $existing['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only manage their own classes.');
        }

        $this->repository->delete($classId);
    }

    /**
     * @return array<string, mixed>
     */
    public function joinClass(string $studentId, string $code): array
    {
        $row = $this->repository->findByCode($code);

        if (!is_array($row)) {
            throw new ApiException(404, 'Class not found. Check the code and try again.');
        }

        $class = $this->mapper->mapRow($row);
        if (in_array($studentId, $class['studentIds'], true)) {
            throw new ApiException(409, 'You are already enrolled in this class.');
        }

        $this->repository->enrollStudent($class['id'], $studentId);

        return $this->getClassById($class['id']);
    }

    /**
     * @return array<string, mixed>
     */
    public function leaveClass(string $classId, string $studentId): array
    {
        $this->getClassById($classId);
        $this->repository->removeStudent($classId, $studentId);

        return $this->getClassById($classId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function enrollStudent(array $authUser, string $classId, string $studentId): array
    {
        $class = $this->getClassById($classId);
        if ($authUser['role'] === 'teacher' && $class['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only manage their own classes.');
        }

        $this->repository->enrollStudent($classId, $studentId);

        return $this->getClassById($classId);
    }

    /**
     * @param array<string, mixed> $authUser
     * @return array<string, mixed>
     */
    public function removeStudent(array $authUser, string $classId, string $studentId): array
    {
        $class = $this->getClassById($classId);
        if ($authUser['role'] === 'teacher' && $class['teacherId'] !== $authUser['id']) {
            throw new ApiException(403, 'Teachers can only manage their own classes.');
        }

        $this->repository->removeStudent($classId, $studentId);

        return $this->getClassById($classId);
    }

    /**
     * @return array<string, mixed>
     */
    private function getClassById(string $classId): array
    {
        $row = $this->repository->findById($classId);

        if (!is_array($row)) {
            throw new ApiException(404, 'Class not found.');
        }

        return $this->mapper->mapRow($row);
    }
}

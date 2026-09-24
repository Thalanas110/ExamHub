<?php

declare(strict_types=1);

namespace App\Shared\Database;

use PDO;
use Pdo\Mysql;
use RuntimeException;

final class RoutineGateway
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @param array<int, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function call(string $procedure, array $params = []): array
    {
        $rowsets = $this->callMulti($procedure, $params);
        return $rowsets[0] ?? [];
    }

    /**
     * @param array<int, mixed> $params
     * @return array<int, array<int, array<string, mixed>>>
     */
    public function callMulti(string $procedure, array $params = []): array
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $procedure)) {
            throw new RuntimeException('Invalid procedure name.');
        }

        $placeholders = implode(', ', array_fill(0, count($params), '?'));
        $sql = sprintf('CALL %s(%s)', $procedure, $placeholders);

        $stmt = $this->pdo->prepare($sql);
        foreach (array_values($params) as $index => $value) {
            $stmt->bindValue($index + 1, $value);
        }

        $stmt->execute();

        $results = [];
        do {
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($rows !== false) {
                $results[] = $rows;
            }
        } while ($stmt->nextRowset());

        $stmt->closeCursor();

        return $results;
    }
}

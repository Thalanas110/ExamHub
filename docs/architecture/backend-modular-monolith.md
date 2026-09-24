# Backend modular monolith

The backend is a vanilla PHP 8.5 modular monolith. Each feature module owns its application logic, presentation routes/controllers, and routine-backed infrastructure adapters. Shared code is limited to platform concerns such as HTTP transport, configuration, database access, security, mapping utilities, and observability.

## Composition

api/index.php is the HTTP composition root. BackendApplicationFactory creates the service container and router, and ModuleRegistry registers module routes in the established order. There is no legacy route registry or compatibility facade.

The current modules are:

- Auth
- Users
- Classes
- Exams
- Results
- Reports
- Data
- Docs
- Violations
- Health

Module internals communicate through application/domain contracts. Stored procedure names remain inside routine adapters, preserving the existing database behavior and payload ordering.

## Runtime and verification

The supported runtime is PHP 8.5.x. Composer requires ^8.5, and Docker uses php:8.5-apache.

Useful checks from backend/:

    php tests/run_all.php
    php tests/architecture/ProductionArchitectureTest.php
    php tests/RouteParityTest.php

Database-backed tests require the project environment and reachable database. They report their missing environment explicitly when those prerequisites are unavailable.

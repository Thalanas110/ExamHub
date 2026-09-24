<?php

declare(strict_types=1);

namespace App\Bootstrap;

use App\Shared\Config\AppConfig;
use App\Controllers\AdminController;
use App\Controllers\AuthController;
use App\Controllers\ClassesController;
use App\Controllers\DataController;
use App\Controllers\DocsController;
use App\Controllers\ExamViolationsController;
use App\Controllers\ExamsController;
use App\Controllers\HealthController;
use App\Controllers\ProfileController;
use App\Controllers\ReportsController;
use App\Controllers\ResultsController;
use App\Controllers\UsersController;
use App\Shared\Database\LogDbConnection;
use App\Shared\Database\RoutineGateway;
use App\Logging\AdminLogReadService;
use App\Shared\Observability\AuditLogService;
use App\Logging\ExamViolationService;
use App\Shared\Observability\LogRetentionService;
use App\Shared\Observability\RequestLogService;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Security\JwtService;
use App\Shared\Security\PasswordHasher;
use App\Modules\Auth\Application\AuthService;
use App\Services\ApiDocsVerificationService;
use App\Services\ClassService;
use App\Services\DataService;
use App\Services\ExamService;
use App\Services\ReportService;
use App\Services\ResultService;
use App\Services\SeedService;
use App\Services\StudentExamAccommodationService;
use App\Services\ViolationCaseService;
use App\Services\Support\ExamMapper;
use App\Services\Support\ExamPayloadValidator;
use App\Services\Support\QuestionAnalyticsBuilder;
use App\Services\Support\ValueNormalizer;
use App\Services\UserService;
use Throwable;

final class ServiceContainer
{
    public function __construct(
        public AuthService $authService,
        public SeedService $seedService,
        public RequestLogService $requestLogService,
        public AuditLogService $auditLogService,
        public LogRetentionService $logRetentionService,
        public HealthController $healthController,
        public AuthController $authController,
        public ProfileController $profileController,
        public UsersController $usersController,
        public ClassesController $classesController,
        public ExamsController $examsController,
        public ResultsController $resultsController,
        public AdminController $adminController,
        public ReportsController $reportsController,
        public DataController $dataController,
        public DocsController $docsController,
        public ExamViolationsController $examViolationsController,
    ) {
    }

    public static function build(AppConfig $config, RoutineGateway $gateway): self
    {
        $crypto = new AesGcmCrypto($config->encryptionKey);
        $passwordHasher = new PasswordHasher();
        $jwtService = new JwtService($config->jwtSecret);
        $normalizer = new ValueNormalizer();
        $mapper = new ExamMapper($crypto, $normalizer);
        $examPayloadValidator = new ExamPayloadValidator();

        $authService = new AuthService(
            config: $config,
            gateway: $gateway,
            crypto: $crypto,
            passwordHasher: $passwordHasher,
            jwtService: $jwtService,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $userService = new UserService(
            gateway: $gateway,
            crypto: $crypto,
            passwordHasher: $passwordHasher,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $classService = new ClassService(
            gateway: $gateway,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $studentExamAccommodationService = new StudentExamAccommodationService(
            gateway: $gateway,
            crypto: $crypto,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $examService = new ExamService(
            gateway: $gateway,
            mapper: $mapper,
            normalizer: $normalizer,
            validator: $examPayloadValidator,
            accommodationService: $studentExamAccommodationService,
        );

        $resultService = new ResultService(
            gateway: $gateway,
            crypto: $crypto,
            mapper: $mapper,
            normalizer: $normalizer,
            accommodationService: $studentExamAccommodationService,
        );

        $dataService = new DataService(
            gateway: $gateway,
            mapper: $mapper,
        );

        $reportService = new ReportService(
            gateway: $gateway,
            mapper: $mapper,
            dataService: $dataService,
            questionAnalyticsBuilder: new QuestionAnalyticsBuilder(),
        );

        $seedService = new SeedService(
            config: $config,
            gateway: $gateway,
            crypto: $crypto,
            passwordHasher: $passwordHasher,
        );

        $docsVerificationService = new ApiDocsVerificationService();

        $logGateway = null;
        try {
            $logPdo = (new LogDbConnection($config))->pdo();
            $logGateway = new RoutineGateway($logPdo);
        } catch (Throwable) {
            $logGateway = null;
        }

        return new self(
            authService: $authService,
            seedService: $seedService,
            requestLogService: new RequestLogService($logGateway),
            auditLogService: new AuditLogService($logGateway),
            logRetentionService: new LogRetentionService($logGateway, $config->logRetentionDays),
            healthController: new HealthController(),
            authController: new AuthController($authService),
            profileController: new ProfileController($authService),
            usersController: new UsersController($userService),
            classesController: new ClassesController($classService),
            examsController: new ExamsController($examService),
            resultsController: new ResultsController($resultService),
            adminController: new AdminController(
                $reportService,
                new AdminLogReadService($logGateway),
            ),
            reportsController: new ReportsController($reportService),
            dataController: new DataController($dataService, $seedService),
            docsController: new DocsController($docsVerificationService),
            examViolationsController: new ExamViolationsController(
                new ExamViolationService($logGateway),
                new ViolationCaseService($logGateway),
            ),
        );
    }
}

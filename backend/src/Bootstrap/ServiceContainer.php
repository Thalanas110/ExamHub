<?php

declare(strict_types=1);

namespace App\Bootstrap;

use App\Shared\Config\AppConfig;
use App\Modules\Reports\Presentation\AdminController;
use App\Modules\Auth\Presentation\AuthController;
use App\Modules\Classes\Presentation\ClassesController;
use App\Modules\Data\Presentation\DataController;
use App\Modules\Docs\Presentation\DocsController;
use App\Modules\Violations\Presentation\ExamViolationsController;
use App\Modules\Exams\Presentation\ExamsController;
use App\Modules\Health\Presentation\HealthController;
use App\Modules\Users\Presentation\ProfileController;
use App\Modules\Reports\Presentation\ReportsController;
use App\Modules\Results\Presentation\ResultsController;
use App\Modules\Users\Presentation\UsersController;
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
use App\Modules\Auth\Infrastructure\RoutineAuthRepository;
use App\Modules\Users\Infrastructure\RoutineUserRepository;
use App\Modules\Docs\Application\ApiDocsVerificationService;
use App\Modules\Classes\Application\ClassService;
use App\Modules\Classes\Application\ClassMapper;
use App\Modules\Classes\Infrastructure\RoutineClassRepository;
use App\Modules\Data\Application\DataService;
use App\Modules\Exams\Application\ExamService;
use App\Modules\Reports\Application\ReportService;
use App\Modules\Results\Application\ResultService;
use App\Modules\Results\Application\ResultMapper;
use App\Modules\Results\Infrastructure\RoutineResultRepository;
use App\Modules\Data\Application\SeedService;
use App\Modules\Exams\Application\StudentExamAccommodationService;
use App\Modules\Exams\Infrastructure\RoutineExamRepository;
use App\Modules\Violations\Application\ViolationCaseService;
use App\Services\Support\ExamMapper;
use App\Modules\Exams\Application\ExamPayloadValidator;
use App\Services\Support\QuestionAnalyticsBuilder;
use App\Services\Support\ValueNormalizer;
use App\Modules\Users\Application\UserService;
use App\Modules\Users\Application\ProfileService;
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
            repository: new RoutineAuthRepository($gateway),
            crypto: $crypto,
            passwordHasher: $passwordHasher,
            jwtService: $jwtService,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $userService = new UserService(
            repository: new RoutineUserRepository($gateway),
            crypto: $crypto,
            passwordHasher: $passwordHasher,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $classService = new ClassService(
            repository: new RoutineClassRepository($gateway),
            mapper: new ClassMapper($normalizer),
            normalizer: $normalizer,
        );

        $studentExamAccommodationService = new StudentExamAccommodationService(
            gateway: $gateway,
            crypto: $crypto,
            mapper: $mapper,
            normalizer: $normalizer,
        );

        $examService = new ExamService(
            repository: new RoutineExamRepository($gateway),
            mapper: $mapper,
            normalizer: $normalizer,
            validator: $examPayloadValidator,
            accommodationService: $studentExamAccommodationService,
        );

        $resultService = new ResultService(
            crypto: $crypto,
            mapper: $mapper,
            resultMapper: new ResultMapper($crypto, $normalizer),
            normalizer: $normalizer,
            accommodationService: $studentExamAccommodationService,
            repository: new RoutineResultRepository($gateway),
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
            profileController: new ProfileController(new ProfileService($authService)),
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

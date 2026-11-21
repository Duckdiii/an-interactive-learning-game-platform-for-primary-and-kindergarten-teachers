// Ranh giới import của frontend, chạy bằng `npm run depcruise` (CI job frontend). Mỗi luật ghi đúng ranh giới code
// đang giữ được (đo bằng depcruise lúc thêm, 2026-11-15); muốn nới luật thì sửa ở đây kèm lý do, không thêm ngoại lệ lẻ.
const UI = "^src/(components|layouts|pages|games|player|hooks|context|providers)/";
const TEST = "(\\.test\\.tsx?$|^src/test/|^src/test-setup\\.ts$)";
// Luật tầng và vòng import chỉ xét import chạy thật: `import type` bị xoá khi build nên không tạo phụ thuộc lúc chạy
// (lúc thêm: 11 vòng trong editor/play và utils/insights → services/home đều chỉ là `import type`).
const RUNTIME_ONLY = ["type-only"];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Vòng import làm thứ tự khởi tạo module khó đoán và khó tách test.",
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: RUNTIME_ONLY } },
    },
    {
      name: "pages-only-from-app",
      severity: "error",
      comment: "Trang (của giáo viên và của học sinh) chỉ được App (router) nạp; dùng chung thì chuyển sang components/hooks.",
      from: { path: "^src/", pathNot: ["^src/App\\.tsx$", "^src/(player/)?pages/", TEST] },
      to: { path: "^src/(player/)?pages/" },
    },
    {
      name: "base-layer-has-no-app-deps",
      severity: "error",
      comment: "types/constants/utils/config/routes là tầng đáy: không phụ thuộc API, service hay UI.",
      from: { path: "^src/(types|constants|utils|config|routes)/", pathNot: TEST },
      to: { path: ["^src/(api|services)/", UI, "^src/App\\.tsx$"], dependencyTypesNot: RUNTIME_ONLY },
    },
    {
      name: "data-layer-has-no-ui-deps",
      severity: "error",
      // `src/player/api` cố ý nằm ngoài luật này: mock của nó dùng hàm thuần `games/common/seededDerangement` (2026-11-15).
      comment: "api/services chỉ lo dữ liệu; không import component, trang, hook hay context.",
      from: { path: "^src/(api|services)/", pathNot: TEST },
      to: { path: [UI, "^src/App\\.tsx$"], dependencyTypesNot: RUNTIME_ONLY },
    },
    {
      name: "games-are-renderers",
      severity: "error",
      comment:
        "Renderer trong games/ nhận dữ liệu qua props (canvas-engine.md). Chỉ được dùng theme của player và " +
        "services/pipeline (kho asset, âm thanh); không gọi API, không dùng trang, layout, component hay context của app.",
      from: { path: "^src/games/", pathNot: TEST },
      to: {
        path: ["^src/(api|pages|layouts|components|hooks|context|providers)/", "^src/player/", "^src/services/"],
        pathNot: ["^src/player/theme/", "^src/services/pipeline/"],
        dependencyTypesNot: RUNTIME_ONLY,
      },
    },
    {
      name: "no-prod-import-of-tests",
      severity: "error",
      comment: "Code chạy thật không import file test hay tiện ích test.",
      from: { path: "^src/", pathNot: TEST },
      to: { path: TEST },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "Code chạy thật không import gói chỉ có trong devDependencies (vitest, testing-library...).",
      from: { path: "^src/", pathNot: TEST },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.app.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default", "types"] },
  },
};

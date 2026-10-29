import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir:"tests/browser",timeout:45000,workers:1,reporter:"list",use:{baseURL:"http://127.0.0.1:5173",channel:"chrome",headless:true,screenshot:"only-on-failure",trace:"retain-on-failure",viewport:{width:1440,height:1100}},outputDir:"test-results" });

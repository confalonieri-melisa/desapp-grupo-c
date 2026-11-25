import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const controllersDirectory = path.resolve("src/backend/controllers");
const servicesDirectory = path.resolve("src/backend/services");
const modelsDirectory = path.resolve("src/backend/models");

function controllerFiles(): string[] {
  return fs
    .readdirSync(controllersDirectory)
    .filter((fileName) => fileName.endsWith(".ts"))
    .map((fileName) => path.join(controllersDirectory, fileName));
}

function serviceFiles(): string[] {
  return fs
    .readdirSync(servicesDirectory)
    .filter((fileName) => fileName.endsWith(".ts"))
    .map((fileName) => path.join(servicesDirectory, fileName));
}

function modelFiles(): string[] {
  return fs
    .readdirSync(modelsDirectory)
    .filter((fileName) => fileName.endsWith(".ts"))
    .map((fileName) => path.join(modelsDirectory, fileName));
}

function importsFrom(filePath: string): string[] {
  return [...fs.readFileSync(filePath, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

function forbiddenImports(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((importPath) => /(?:^|\/)(?:repositories|db)(?:\/|$)/.test(importPath));
}

describe("backend architecture", () => {
  it("allows every controller to depend on the service layer", () => {
    const controllersWithoutService = controllerFiles().filter(
      (filePath) => !importsFrom(filePath).some((importPath) => /(?:^|\/)services\//.test(importPath)),
    );

    expect(controllersWithoutService).toEqual([]);
  });

  it("allows services to depend on repositories", () => {
    const serviceRepositoryImports = serviceFiles().flatMap((filePath) =>
      importsFrom(filePath).filter((importPath) => /(?:^|\/)repositories\//.test(importPath)),
    );

    expect(serviceRepositoryImports.length).toBeGreaterThan(0);
  });

  it("keeps models independent from application and infrastructure layers", () => {
    const violations = modelFiles().flatMap((filePath) =>
      importsFrom(filePath)
        .filter((importPath) =>
          /(?:^|\/)(?:controllers|services|repositories|db|adapters)(?:\/|$)/.test(importPath),
        )
        .map((importPath) => `${path.relative(process.cwd(), filePath)} -> ${importPath}`),
    );

    expect(violations).toEqual([]);
  });

  it("does not allow controllers to access repositories or the database directly", () => {
    const violations = controllerFiles().flatMap((filePath) => {
      const imports = forbiddenImports(fs.readFileSync(filePath, "utf8"));
      return imports.map((importPath) => `${path.relative(process.cwd(), filePath)} -> ${importPath}`);
    });

    expect(violations).toEqual([]);
  });
});

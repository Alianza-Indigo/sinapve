import { describe, expect, it } from "vitest";
import rootPackage from "../../../../package.json";
import webPackage from "../../package.json";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("package policy", () => {
  it("does not include Supabase packages", () => {
    const root = rootPackage as PackageJson;
    const web = webPackage as PackageJson;
    const allDependencies = {
      ...root.dependencies,
      ...root.devDependencies,
      ...web.dependencies,
      ...web.devDependencies
    };

    expect(Object.keys(allDependencies).some((name) => name.startsWith("@supabase/"))).toBe(false);
  });
});

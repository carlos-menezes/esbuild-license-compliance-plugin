import type { Plugin, PluginBuild } from "esbuild";
import {
	checkLicenseCompliance,
	type LicenseComplianceOptions,
	scanPackages,
} from "./lib.js";

/**
 * License Compliance Plugin for `esbuild`.
 *
 * @param options {@link LicenseComplianceOptions}
 * @returns
 */
function licenseCompliancePlugin(options?: LicenseComplianceOptions): Plugin {
	return {
		name: "license-compliance",
		setup(build: PluginBuild) {
			build.onStart(async () => {
				try {
					const packages = await scanPackages();
					const violations = checkLicenseCompliance(packages, options || {});

					if (violations.length > 0) {
						const violationList = violations
							.map((v) => `${v.package} (${v.license})`)
							.join(", ");
						return {
							errors: [
								{
									text: `License violations found: ${violationList}`,
									location: null,
								},
							],
						};
					}
				} catch (error) {
					return {
						errors: [
							{ text: `License check failed: ${error}`, location: null },
						],
					};
				}
			});
		},
	};
}

export { licenseCompliancePlugin };
export type { LicenseComplianceOptions } from "./lib";

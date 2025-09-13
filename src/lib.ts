import * as fs from "node:fs";
import * as path from "node:path";

export type SPDXLicenseId =
	| "AGPL-3.0-only"
	| "Apache-2.0"
	| "BSD-2-Clause"
	| "BSD-3-Clause"
	| "BSL-1.0"
	| "CC0-1.0"
	| "CDDL-1.0"
	| "CDDL-1.1"
	| "EPL-1.0"
	| "EPL-2.0"
	| "GPL-2.0-only"
	| "GPL-3.0-only"
	| "ISC"
	| "LGPL-2.0-only"
	| "LGPL-2.1-only"
	| "LGPL-2.1-or-later"
	| "LGPL-3.0-only"
	| "LGPL-3.0-or-later"
	| "MIT"
	| "MPL-2.0"
	| "MS-PL"
	| "UNLICENSED";

/**
 * Options for the License Compliance Plugin.
 */
export interface LicenseComplianceOptions {
	/**
	 * List of allowed SPDX license identifiers.
	 * If specified, only packages with these licenses will be allowed.
	 * @example  ['MIT', 'Apache-2.0']
	 */
	allowed?: SPDXLicenseId[];

	/**
	 * List of disallowed SPDX license identifiers.
	 * If specified, packages with these licenses will be flagged as violations.
	 * @example ['GPL-3.0-only']
	 */
	disallowed?: SPDXLicenseId[];
	/**
	 * List of package name patterns to ignore during license checks.
	 * Supports glob patterns (e.g., 'eslint-*' to ignore all eslint plugins).
	 * @example  ['eslint-*', 'some-package']
	 */
	ignores?: string[];
}

interface PackageInfo {
	name: string;
	version: string;
	license: string;
	path: string;
}

interface LicenseViolation {
	package: string;
	license: string;
	reason: string;
}

function extractLicense(pkg: Record<string, unknown>): string {
	if (pkg.license) {
		return pkg.license as string;
	}

	if (pkg.licenses && Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
		return (pkg.licenses as Array<{ type: string; url: string }>)
			.map((l) => l.type)
			.join(" OR ");
	}

	return "UNKNOWN";
}

function isIgnored(packageName: string, ignores: string[]): boolean {
	return ignores.some((pattern) => {
		// Convert glob pattern to regex
		const regexPattern = pattern
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".")
			.replace(/\[([^\]]+)\]/g, "[$1]");

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(packageName);
	});
}

function parseLicenseExpression(licenseExpression: string): string[] {
	const normalized = licenseExpression
		.split(/\s+(?:OR)\s+/i)
		.map((license) => license.trim())
		.filter((license) => license.length > 0);

	return normalized;
}

function isLicenseAllowed({
	license,
	allowed,
	disallowed,
}: {
	license: string;
	allowed: SPDXLicenseId[];
	disallowed: SPDXLicenseId[];
}): {
	allowed: boolean;
	reason?: string;
} {
	const licenses = parseLicenseExpression(license);

	for (const license of licenses) {
		const lowerLicense = license.toLowerCase();
		if (disallowed.some((d) => lowerLicense.includes(d.toLowerCase()))) {
			return {
				allowed: false,
				reason: `License '${license}' is not allowed`,
			};
		}
	}

	// If we have an allowed list, check that at least one license is in it
	if (allowed.length > 0) {
		const hasAllowedLicense = licenses.some((license) => {
			const lowerLicense = license.toLowerCase();
			return allowed.some((a) => lowerLicense.includes(a.toLowerCase()));
		});

		if (!hasAllowedLicense) {
			return {
				allowed: false,
				reason: `None of the licenses '${licenses.join(", ")}' are in the allowed list`,
			};
		}
	}

	return { allowed: true };
}

export function checkLicenseCompliance(
	packages: PackageInfo[],
	options: LicenseComplianceOptions,
): LicenseViolation[] {
	const { allowed = [], disallowed = [], ignores = [] } = options;

	const violations: LicenseViolation[] = [];

	for (const pkg of packages) {
		// Skip packages that match ignore patterns
		if (isIgnored(pkg.name, ignores)) {
			continue;
		}

		if (pkg.license === "UNKNOWN") {
			console.warn(`${pkg.name}: No license information found`);
			continue;
		}

		const licenseCheck = isLicenseAllowed({
			license: pkg.license,
			allowed,
			disallowed,
		});
		if (!licenseCheck.allowed && licenseCheck.reason) {
			violations.push({
				package: pkg.name,
				license: pkg.license,
				reason: licenseCheck.reason,
			});
		}
	}

	return violations;
}

function resolvePackagePath(packageName: string, basePath: string): string {
	const candidates = [
		path.join(basePath, "node_modules", packageName),
		path.join(process.cwd(), "node_modules", packageName),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}

	throw new Error(`Package ${packageName} not found`);
}

function findPackageJson(startPath = process.cwd()): string | null {
	let currentPath = startPath;

	while (currentPath !== path.dirname(currentPath)) {
		const candidate = path.join(currentPath, "package.json");
		if (fs.existsSync(candidate)) return candidate;
		currentPath = path.dirname(currentPath);
	}

	return null;
}

async function scanDirectPackage(
	packageName: string,
	basePath: string,
): Promise<PackageInfo | null> {
	try {
		const packagePath = resolvePackagePath(packageName, basePath);
		const packageJsonPath = path.join(packagePath, "package.json");

		if (!fs.existsSync(packageJsonPath)) {
			console.warn(`No package.json found for ${packageName}`);
			return null;
		}

		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

		return {
			name: packageName,
			version: packageJson.version || "unknown",
			license: extractLicense(packageJson),
			path: packagePath,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (msg.includes("not found")) {
			console.warn(
				`Skipping ${packageName}: not found (possibly a peer dependency)`,
			);
		} else {
			console.warn(`Failed to scan ${packageName}: ${msg}`);
		}
		return null;
	}
}

export async function scanPackages(): Promise<PackageInfo[]> {
	const packageJsonPath = findPackageJson();
	if (!packageJsonPath) throw new Error("package.json not found");

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const allDependencies = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
		...packageJson.optionalDependencies,
		...packageJson.peerDependencies,
	};

	const basePath = path.dirname(packageJsonPath);

	return Promise.all(
		Object.keys(allDependencies).map((pkg) => scanDirectPackage(pkg, basePath)),
	).then((results) => results.filter(Boolean) as PackageInfo[]);
}

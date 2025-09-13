import { build } from "esbuild";

Promise.all([
	// CommonJS build
	build({
		entryPoints: ["./src/index.ts"],
		bundle: true,
		outdir: "dist/cjs",
		platform: "node",
		format: "cjs",
		target: "node14",
		external: ["esbuild"],
	}),
	// ESM build
	build({
		entryPoints: ["./src/index.ts"],
		bundle: true,
		outdir: "dist/esm",
		platform: "node",
		format: "esm",
		target: "node14",
		external: ["esbuild"],
	}),
])
	.catch(() => process.exit(1));

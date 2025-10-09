// Temporary type stub to avoid TS errors before installing 'yaml' types.
// This will be superseded by the actual package types when dependencies are installed.
declare module "yaml" {
	export function parse(input: string): any;
	export function stringify(value: any): string;

	const _default: {
		parse: typeof parse;
		stringify: typeof stringify;
	};
	export default _default;
}

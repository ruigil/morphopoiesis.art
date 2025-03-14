import { WgslParser } from "./wgsl_parser.ts";
import { Reflect } from "./reflect/reflect.ts";

export * from "./reflect/info.ts";

export class WgslReflect extends Reflect {
  constructor(code?: string) {
    super();
    if (code) {
      this.update(code);
    }
  }

  update(code: string): void {
    const parser = new WgslParser();
    const ast = parser.parse(code);
    this.updateAST(ast);
  }
}

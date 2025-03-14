import { Node, Type } from "../wgsl_ast.ts";
import { ExecContext } from "./exec_context.ts";
import { TypeInfo } from "../wgsl_reflect.ts";
import { Data } from "../wgsl_ast.ts";

export class ExecInterface {
    evalExpression(node: Node, context: ExecContext): Data | null {
        return null;
    }

    getTypeInfo(type: Type | string): TypeInfo | null {
        return null; 
    }

    getVariableName(node: Node, context: ExecContext): string | null {
        return "";
    }
}

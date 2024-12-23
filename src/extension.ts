// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { reverse } from 'dns';
import * as vscode from 'vscode';

type Operand = string | Expression; // Operand can be a string or another Expression
type Expression = { left: Operand; operator: string; right: Operand };

var counter: number;
counter = 0;
class ExpressionParser {
    private operators: Set<string> = new Set(["+", "-", "*", "/", "%", "&&", "||", "<ref>", "|", "^", "<<", ">>", "==", "!=", "<", "<=", ">", ">=", "?", ":", "<type_cast>", "<deref>", ".", "->", "++", "--","~","!","&"]);
    private unaryOperators: Set<string> = new Set(["&", "*", "+", "-", "++", "--", "~", "!"]);
    private multiUseOperators: Map<string, string> = new Map([ 
        ["&","<ref>"], 
        ["*","<deref>"],
        ["+","+"],
        ["-","-"],
        ["++","++"],
        ["--","--"], 
        ["~","~"],
        ["!","!"]]);
    private precedence: Map<string, number> = new Map([
        ["||", 1],  // 逻辑或 (Logical OR)
        ["&&", 2],  // 逻辑与 (Logical AND)
        ["|", 3],   // 按位或 (Bitwise OR)
        ["^", 4],   // 按位异或 (Bitwise XOR)
        ["&", 5],   // 按位与 (Bitwise AND)
        ["==", 6], ["!=", 6],  // 相等和不等运算符
        ["<", 7], ["<=", 7], [">", 7], [">=", 7],  // 比较运算符
        ["<<", 8], [">>", 8],  // 移位运算符
        ["+", 9], ["-", 9],  // 加法和减法运算符
        ["*", 10], ["/", 10], ["%", 10],  // 乘法、除法和取模运算符
        ["?", 11], [":", 11],  // 三目运算符
        ["<deref>", 12], ["<ref>", 12], ["<type_cast>", 12],  // 解引用和类型转换的单目运算符
        ["~", 12],  // 按位取反运算符
        ["!", 12],  // 逻辑非运算符
        [".", 13], ["->", 13],  // 成员访问运算符
        ["++", 12], ["--", 12],  // 自增和自减单目运算符
        ["::", 14]  // 域解析运算符 (Scope Resolution Operator)
    ]);

    private isOperator(char: string): boolean {
        return this.operators.has(char);
    }

    private isUnaryOperator(char: string): boolean {
        return this.unaryOperators.has(char);
    }

    private precedenceOf(op: string): number {
        return this.precedence.get(op) || 0;
    }
    private translateMultiUsedOp(op: string): string {
        const newOp = this.multiUseOperators.get(op);
        if (typeof newOp !== "undefined")
        {
            return newOp;
        }
        else
        {
            return "";
        }
    }
    parse(expression: string): Expression[] {
        let outputStack: (string | Expression)[] = [];
        let operatorStack: string[] = [];
        let selfIncStack: (string | Expression)[] = [];

        let tokens = this.tokenize(expression);
        let add_op: string;
        let numPushedOperands, numOperandSnap: number;
        numPushedOperands = 0;
        numOperandSnap = 0;
        let numConsecutiveOp: number;
        // the count for the number of consecutive Operators
        numConsecutiveOp = 0;
        for (let token of tokens) {
            add_op = '';
            if (this.isOperator(token)) {
                numConsecutiveOp = numConsecutiveOp + 1;
                if (numConsecutiveOp > 1 || (outputStack.length === 0)) {
                    if (this.isUnaryOperator(token)) {
                        outputStack.push('');
                        operatorStack.push(this.translateMultiUsedOp(token));
                        continue;
                    }
                    else {
                        //error
                    }
                }
                //post self increasement.
                if (token === "++" || token === "--") {
                    const incValue = outputStack.pop() as Operand;
                    outputStack.push(incValue);
                    selfIncStack.push({ left: incValue, operator: token, right: "" });
                    //for a+++b case
                    numConsecutiveOp--;
                    continue;
                }
                while (
                    operatorStack.length &&
                    this.precedenceOf(operatorStack[operatorStack.length - 1]) >= this.precedenceOf(token)
                ) {
                    this.processOperator(outputStack, operatorStack.pop()!);
                }
                operatorStack.push(token);
                if (add_op !== '') {
                    operatorStack.push(add_op);
                }
            } else if (token === "(" || token === "[") {
                operatorStack.push(token);
                numOperandSnap = numPushedOperands;
                numConsecutiveOp = numConsecutiveOp + 1;
            } else if (token === ")" || token === "]") {
                let num_token_in_brackets: number;
                numConsecutiveOp = 0;
                num_token_in_brackets = numPushedOperands - numOperandSnap;
                if (num_token_in_brackets === 1 && outputStack.length)
                {
                    let castType = "("+ outputStack.pop();
                    while (operatorStack.length && operatorStack[operatorStack.length - 1] !== "(")
                    {
                        castType = castType + operatorStack.pop();
                    }
                    castType = castType + ")";
                    outputStack.push(castType);
                    add_op = "<type_cast>";
                }
                else
                {
                while (operatorStack.length && (operatorStack[operatorStack.length - 1] !== "(" && operatorStack[operatorStack.length - 1] !== "[")) {
                    this.processOperator(outputStack, operatorStack.pop()!);
                }
                }
                // Remove '('
                operatorStack.pop();

                if (add_op !== '') {
                    operatorStack.push(add_op);
                }
                // array 
                if (token === "]") {
                    operatorStack.push("+");
                }
                numOperandSnap = 0;
            } else {
                numConsecutiveOp = 0;
                outputStack.push(token);
                numPushedOperands++;
            }
        }

        while (operatorStack.length) {
            this.processOperator(outputStack, operatorStack.pop()!);
        }
        // concat the self increasment stack with the output stack
        outputStack = outputStack.concat(selfIncStack);
        return outputStack as Expression[];
    }

    private processOperator(outputStack: (string | Expression)[], operator: string) {
        if (operator === "?") {
            const falseExpr = outputStack.pop() as Operand;
            const trueExpr = outputStack.pop() as Operand;
            const condition = outputStack.pop() as Operand;
            outputStack.push({ left: condition, operator: "?", right: { left: trueExpr, operator: ":", right: falseExpr } });
        } else {
            let right: Operand;
            let left: Operand;
            right = outputStack.pop() as Operand;
            left = outputStack.pop() as Operand;
            outputStack.push({ left, operator, right });
        }
    }

    private tokenize(expression: string): string[] {
        //const regex = /\d+(\.\d+)?|[a-zA-Z_]\w*|==|!=|<=|>=|\+\+|--|->|&&|\|\||<<|>>|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|::|\?|:|->\*|\*|\[|\]|\(|\)|{|}|\.|\+|-|\*|\/|%|&|\||\^|~|!|<|>|=|#/g;
        const regex = /0[xX][\da-fA-F]+|\d+(\.\d+)?|[a-zA-Z_]\w*|==|!=|<=|>=|\+\+|--|->|&&|\|\||<<|>>|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|::|\?|:|->\*|\*|\[|\]|\(|\)|{|}|\.|\+|-|\*|\/|%|&|\||\^|~|!|<|>|=|#/g;
        return expression.match(regex) || [];
    }
}

// Helper function to convert Expression to string
function expressionToString(exp: Operand, steps: string[]): string {
    if (typeof exp === "string") {
        counter++;
        steps.push(`${'x' + counter} = ${exp}`);
        return exp;
    } else {
        if (typeof exp.left !== "string") {
            exp.left = expressionToString(exp.left, steps);
        }
        if (typeof exp.right !== "string") {
            exp.right = expressionToString(exp.right, steps);
        }
        if (typeof exp.left === "string" && typeof exp.right === "string") {
            counter++;
            steps.push(`${'x' + counter} = ${exp.left} ${exp.operator} ${exp.right}`);
            return `x` + counter;
        }
    }
    return '';
}

// processExpression function
function processExpression(expression: string): string[] {
    const parser = new ExpressionParser();
    const steps: string[] = [];
    let result: (string | Expression)[];
    result = parser.parse(expression);
    counter = -1;
    // construct the output string
    result.forEach((exp, index) => {
        expressionToString(exp, steps);
    });

    return steps;
}

function createStatusBarButton(context: vscode.ExtensionContext) {
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    button.text = '$(beaker) OpSnap';
    button.command = 'c-cpp-op-snap.parseSelectedText';
    button.show();
    context.subscriptions.push(button);
}

export function activate(context: vscode.ExtensionContext) {
    //console.log('Congratulations, "c-cpp-op-snap" is now active!');
    const outputChannel = vscode.window.createOutputChannel("C/C++ Operator Parser");

    const disposableC = vscode.commands.registerCommand('c-cpp-op-snap.cTable', () => {
        const panel = vscode.window.createWebviewPanel(
            'mainPage', // Identifies the type of the webview. Used internally
            'C Operator Precedence', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in
            {} // Webview options
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContentC();
    });

    const disposableCpp = vscode.commands.registerCommand('c-cpp-op-snap.cppTable', () => {
        const panel = vscode.window.createWebviewPanel(
            'mainPage', // Identifies the type of the webview. Used internally
            'C++ Operator Precedence', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in
            {} // Webview options
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContentCpp();
    });

    context.subscriptions.push(disposableC);
    context.subscriptions.push(disposableCpp);
    createStatusBarButton(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('c-cpp-op-snap.parseSelectedText', async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                return;
            } else {
                if (editor.document.languageId !== 'cpp' &&
                    editor.document.languageId !== 'c' &&
                    editor.document.languageId !== 'cuda' &&
                    editor.document.languageId !== 'cuda-cpp' &&
                    editor.document.languageId !== 'arduino' &&
                    editor.document.languageId !== 'java' &&
                    editor.document.languageId !== 'csharp' &&
                    editor.document.languageId !== 'javascript' &&
                    editor.document.languageId !== 'php' &&
                    editor.document.languageId !== 'go' &&
                    editor.document.languageId !== 'rust' &&
                    editor.document.languageId !== 'swift' &&
                    editor.document.languageId !== 'd') {
                    vscode.window.showErrorMessage(`The language ID: ${editor.document.languageId} isn't supported`);
                    return;
                }
            }

            const selection = editor.selection;
            if (selection.isEmpty) { return; }

            const selectedText = editor.document.getText(selection).trim();

            if (selectedText) {

                const parsedSteps = processExpression(selectedText);

                if (parsedSteps.length > 0) {
                    outputChannel.clear();
                    outputChannel.show();
                    parsedSteps.forEach(step => outputChannel.appendLine(step));
                }
            } else {
                vscode.window.showErrorMessage('Please select a C/C++ expression to parse.');
            }
        })
    );


}

function getWebviewContentC() {
    return `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>C/C++ Operator Precedence Table</title>
    <style>
        body {
            background-color: black;
            color: white;
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
            box-sizing: border-box;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid white;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #333;
        }
        td {
            background-color: #222;
        }
    </style>
</head>
<body>
    <h1>C Operator Precedence Table</h1>
       <table>
        <tr>
            <th>Precedence</th>
            <th>Operator</th>
            <th>Description</th>
            <th>Associativity</th>
        </tr>
        <tr>
            <td>1</td>
            <td>() [] -> .</td>
            <td>Function call, array subscripting, member access</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>2</td>
            <td>++ --</td>
            <td>Post-increment, post-decrement</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>3</td>
            <td>++ -- + - ! ~ (type) * & sizeof</td>
            <td>Pre-increment, pre-decrement, unary operators, type cast, pointer dereference</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>4</td>
            <td>* / %</td>
            <td>Multiplication, division, modulo</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>5</td>
            <td>+ -</td>
            <td>Addition, subtraction</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>6</td>
            <td>&lt;&lt; &gt;&gt;</td>
            <td>Bitwise shift left, right</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>7</td>
            <td>&lt; &lt;= &gt; &gt;=</td>
            <td>Relational operators</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>8</td>
            <td>== !=</td>
            <td>Equality operators</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>9</td>
            <td>&</td>
            <td>Bitwise AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>10</td>
            <td>^</td>
            <td>Bitwise XOR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>11</td>
            <td>|</td>
            <td>Bitwise OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>12</td>
            <td>&&</td>
            <td>Logical AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>13</td>
            <td>||</td>
            <td>Logical OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>14</td>
            <td>?:</td>
            <td>Ternary conditional</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>15</td>
            <td>= += -= *= /= %= &lt;&lt;= &gt;&gt;= &= ^= |=</td>
            <td>Assignment operators</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>16</td>
            <td>,</td>
            <td>Comma operator</td>
            <td>Left-to-right</td>
        </tr>
    </table>
	<div class="explanation">
        <h2>Explanation:</h2>
        <p>Precedence determines the order in which operators are evaluated in expressions.</p>
        <p>Associativity defines the direction in which an expression is evaluated when operators of the same precedence appear in sequence.</p>
        <p>Left-to-right associativity means the expression is evaluated from left to right, while right-to-left means it is evaluated from right to left.</p>
    </div>
</body>
</html>`;
}

function getWebviewContentCpp() {
    return `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>C/C++ Operator Precedence Table</title>
    <style>
        body {
            background-color: black;
            color: white;
            font-family: Arial, sans-serif;
            padding: 20px;
            margin: 0;
            box-sizing: border-box;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid white;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #333;
        }
        td {
            background-color: #222;
        }
    </style>
</head>
<body>
    <h1>C++ Operator Precedence Table</h1>
     <table>
        <tr>
            <th>Precedence</th>
            <th>Operator</th>
            <th>Description</th>
            <th>Associativity</th>
        </tr>
        <tr>
            <td>1</td>
            <td>() [] -> . ::</td>
            <td>Function call, array subscripting, member access, scope resolution</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>2</td>
            <td>++ -- typeid const_cast dynamic_cast reinterpret_cast</td>
            <td>Post-increment, post-decrement, type identification, cast operators</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>3</td>
            <td>++ -- + - ! ~ (type) * & sizeof new delete</td>
            <td>Pre-increment, pre-decrement, unary operators, type cast, pointer dereference, memory management</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>4</td>
            <td>* / %</td>
            <td>Multiplication, division, modulo</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>5</td>
            <td>+ -</td>
            <td>Addition, subtraction</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>6</td>
            <td>&lt;&lt; &gt;&gt;</td>
            <td>Bitwise shift left, right</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>7</td>
            <td>&lt; &lt;= &gt; &gt;=</td>
            <td>Relational operators</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>8</td>
            <td>== !=</td>
            <td>Equality operators</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>9</td>
            <td>&</td>
            <td>Bitwise AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>10</td>
            <td>^</td>
            <td>Bitwise XOR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>11</td>
            <td>|</td>
            <td>Bitwise OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>12</td>
            <td>&&</td>
            <td>Logical AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>13</td>
            <td>||</td>
            <td>Logical OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>14</td>
            <td>?:</td>
            <td>Ternary conditional</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>15</td>
            <td>= += -= *= /= %= &lt;&lt;= &gt;&gt;= &= ^= |=</td>
            <td>Assignment operators</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>16</td>
            <td>throw</td>
            <td>Exception throwing</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>17</td>
            <td>,</td>
            <td>Comma operator</td>
            <td>Left-to-right</td>
        </tr>
    </table>
	<div class="explanation">
        <h2>Explanation:</h2>
        <p>Precedence determines the order in which operators are evaluated in expressions.</p>
        <p>Associativity defines the direction in which an expression is evaluated when operators of the same precedence appear in sequence.</p>
        <p>Left-to-right associativity means the expression is evaluated from left to right, while right-to-left means it is evaluated from right to left.</p>
    </div>
</body>
</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() { }

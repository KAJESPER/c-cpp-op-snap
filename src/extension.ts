// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const operatorPrecedence: { [key: string]: number } = {
    '||': 1, '&&': 2,
    '|': 3, '^': 4, '&': 5,
    '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7,
    '<<': 8, '>>': 8,
    '+': 9, '-': 9,
    '*': 10, '/': 10, '%': 10,
    '=': 11, '+=': 11, '-=': 11, '*=': 11, '/=': 11, '%=': 11,
    '<<=': 11, '>>=': 11, '&=': 11, '^=': 11, '|=': 11,
    '!': 12, '~': 12, '++': 12, '--': 12,  
    '->': 13, '.': 13,
    '?': 14, ':': 14
};

const operators = ['++', '--', '==', '!=', '>=', '<=', '&&', '||', '+', '-', '*', '/', '%', '=', '>', '<', '&', '|', '^', '!'];

function findLastOperatorIndex(expression: string): number {
    let lastOperatorIndex = -1;
    let lastOperatorLength = 1;

    // 遍历字符串，从左到右找到最后的运算符
    for (let i = 0; i < expression.length; i++) {
        for (let operator of operators) {
            // 检查当前字符及之后是否匹配运算符
            if (expression.slice(i, i + operator.length) === operator) {
                lastOperatorIndex = i; // 记录运算符的起始位置
                lastOperatorLength = operator.length; // 记录运算符的长度
            }
        }
    }

    // 返回最后运算符的索引，如果找到的是多字符运算符，则返回其第一个字符的索引
    return lastOperatorIndex;
}

// 生成临时变量
let tempCounter = 0;
function generateTempVar(): string {
    return `x${tempCounter++}`;
}

// 查找最外层的操作符
function findMainOperator(expression: string): [string, number] {
    let minPrecedence = Infinity;
    let mainOp = '';
    let mainOpIndex = -1;
    let parenCount = 0;

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
        } else if (parenCount === 0) {
            const twoCharOp = expression.substring(i, i + 2);
            // if (twoCharOp === '++' || twoCharOp === '--') {
            //      return [twoCharOp, i];
            //  }
            if (operatorPrecedence[twoCharOp] !== undefined) {
                if (operatorPrecedence[twoCharOp] <= minPrecedence) {
                    minPrecedence = operatorPrecedence[twoCharOp];
                    mainOp = twoCharOp;
                    mainOpIndex = i;
                }
                i++;
            } else if (operatorPrecedence[char] !== undefined) {
                if (operatorPrecedence[char] <= minPrecedence) {
                    minPrecedence = operatorPrecedence[char];
                    mainOp = char;
                    mainOpIndex = i;
                }
            }
        }
    }

    return [mainOp, mainOpIndex];
}

// 处理数组下标
function handleArrayAccess(expression: string, steps: string[]): string {
    let index = expression.indexOf('[');
    if (index === -1) return expression;

    let bracketCount = 0;
    let closingIndex = -1;
    for (let i = index; i < expression.length; i++) {
        if (expression[i] === '[') {
            bracketCount++;
        } else if (expression[i] === ']') {
            bracketCount--;
            if (bracketCount === 0) {
                closingIndex = i;
                break;
            }
        }
    }

    if (closingIndex === -1) {
        throw new Error('Unmatched brackets in the expression');
    }

    let leftPart = expression.slice(0, index).trim();
    let indexExpr = expression.slice(index + 1, closingIndex).trim();
    let remainingExpr = expression.slice(closingIndex + 1).trim();

    const indexVar = splitExpression(indexExpr, steps);
    //const baseVar = splitExpression(leftPart, steps);
    let leftLastOpIndex = findLastOperatorIndex(leftPart);
    let leftRemainingExp = leftPart.slice(0, leftLastOpIndex+1).trim();
    const tempVar = generateTempVar();
    const baseVar = splitExpression(leftPart.slice(leftLastOpIndex + 1,).trim(), steps);
    steps.push(`${tempVar} = ${baseVar}[${indexVar}]`);
    remainingExpr = leftRemainingExp + `${tempVar}` + remainingExpr;
    if (remainingExpr.length > 0) {
        return splitExpression(remainingExpr, steps);
    }

    return tempVar;
}

// 递归拆解表达式
function splitExpression(expression: string, steps: string[] = []): string {
    expression = expression.trim();

    // 去掉分号和逗号
    expression = expression.replace(/[;,]/g, '');

    // 处理数组下标
    let result = handleArrayAccess(expression, steps);
    if (result !== expression) {
        return result;
    }

    if (!/[\+\-\*\/\%\&\|\^\!\<\>\=\~]/.test(expression)) {
        return expression;
    }

    const [mainOp, mainOpIndex] = findMainOperator(expression);
    if (mainOpIndex === -1) {
        if (expression.startsWith('(') && expression.endsWith(')')) {
            return splitExpression(expression.slice(1, -1), steps);
        }
        return expression;
    }

    if (mainOp === '?') {
        const leftExpr = expression.slice(0, mainOpIndex).trim();
        const rest = expression.slice(mainOpIndex + 1).trim();
        const colonIndex = rest.indexOf(':');
        const trueExpr = rest.slice(0, colonIndex).trim();
        const falseExpr = rest.slice(colonIndex + 1).trim();

        const leftVar = splitExpression(leftExpr, steps);
        const trueVar = splitExpression(trueExpr, steps);
        const falseVar = splitExpression(falseExpr, steps);

        const tempVar = generateTempVar();
        steps.push(`${tempVar} = ${leftVar} ? ${trueVar} : ${falseVar}`);
        return tempVar;
    }

    if (mainOp === '++' || mainOp === '--') {
        const targetVar = splitExpression(expression.slice(0, mainOpIndex), steps);
        const tempVar = generateTempVar();
        steps.push(`${tempVar} = ${targetVar}`);
        if (mainOp === '++') {
        steps.push(`${targetVar} = ${targetVar} + 1`);}
        else
        { steps.push(`${targetVar} = ${targetVar} - 1`); } // 自增或自减操作在值使用之后执行
        return tempVar;
    }

    const leftExpr = expression.slice(0, mainOpIndex).trim();
    const rightExpr = expression.slice(mainOpIndex + mainOp.length).trim();

    const leftVar = splitExpression(leftExpr, steps);
    const rightVar = splitExpression(rightExpr, steps);

    const tempVar = generateTempVar();
    steps.push(`${tempVar} = ${leftVar} ${mainOp} ${rightVar}`);

    return tempVar;
}

// 主函数，用于拆解表达式并返回拆解步骤
function processExpression(expression: string): string[] {
    const steps: string[] = [];
    splitExpression(expression, steps);
    return steps;
}


function createStatusBarButton(context: vscode.ExtensionContext) {
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    button.text = '$(beaker) OpSnap'; // 自定义图标和文本
    button.command = 'c-cpp-op-snap.parseSelectedText'; // 按钮点击时触发的命令
    button.show();
    context.subscriptions.push(button);
}

export function activate(context: vscode.ExtensionContext) {
    //console.log('Congratulations, "c-cpp-op-snap" is now active!');
    const outputChannel = vscode.window.createOutputChannel("C/C++ Operator Parser");

    const disposable = vscode.commands.registerCommand('c-cpp-op-snap.table', () => {
        const panel = vscode.window.createWebviewPanel(
            'mainPage', // Identifies the type of the webview. Used internally
            'C/C++ Operator Precedence', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in
            {} // Webview options
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContent();
    });

    context.subscriptions.push(disposable);
    createStatusBarButton(context);

    // 注册命令处理
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
                    vscode.window.showErrorMessage(`Sorry, the language ID ${editor.document.languageId} isn't supported`);
                    return;
                }
            }

            // 获取选中的文本
            const selection = editor.selection;
            if (selection.isEmpty) return; // 如果没有选中内容，直接返回

            const selectedText = editor.document.getText(selection).trim();

            if (selectedText) {
                // 解析选中的文本
                const parsedSteps = processExpression(selectedText);

                if (parsedSteps.length > 0) {
                    tempCounter = 0;
                    // 创建新编辑器文档
                    //const newDoc = await vscode.workspace.openTextDocument({ content: parsedSteps.join('\n'), language: 'plaintext' });
                    //vscode.window.showTextDocument(newDoc, vscode.ViewColumn.Beside);
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

function getWebviewContent() {
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
    <h1>C/C++ Operator Precedence Table</h1>
    <table>
        <tr>
            <th>Precedence</th>
            <th>Operator</th>
            <th>Description</th>
            <th>Associativity</th>
        </tr>
        <tr>
            <td>1</td>
            <td>::</td>
            <td>Scope resolution</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>2</td>
            <td>++ -- () [] . -></td>
            <td>Postfix increment and decrement, function call, array subscript, member access</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>3</td>
            <td>++ -- + - ! ~ * & sizeof new delete (type)</td>
            <td>Prefix increment and decrement, unary plus and minus, logical NOT, bitwise NOT, dereference, address-of, size-of, memory management, type cast</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>4</td>
            <td>.* ->*</td>
            <td>Pointer to member access</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>5</td>
            <td>* / %</td>
            <td>Multiplication, division, modulus</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>6</td>
            <td>+ -</td>
            <td>Addition, subtraction</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>7</td>
            <td>&lt;&lt; &gt;&gt;</td>
            <td>Bitwise left shift, bitwise right shift</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>8</td>
            <td>&lt; &lt;= &gt; &gt;=</td>
            <td>Relational less than, less than or equal to, greater than, greater than or equal to</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>9</td>
            <td>== !=</td>
            <td>Equality, inequality</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>10</td>
            <td>&</td>
            <td>Bitwise AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>11</td>
            <td>^</td>
            <td>Bitwise XOR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>12</td>
            <td>|</td>
            <td>Bitwise OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>13</td>
            <td>&&</td>
            <td>Logical AND</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>14</td>
            <td>||</td>
            <td>Logical OR</td>
            <td>Left-to-right</td>
        </tr>
        <tr>
            <td>15</td>
            <td>?:</td>
            <td>Ternary conditional</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>16</td>
            <td>= += -= *= /= %= <<= >>= &= ^= |=</td>
            <td>Assignment and compound assignment</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>17</td>
            <td>throw</td>
            <td>Throw operator</td>
            <td>Right-to-left</td>
        </tr>
        <tr>
            <td>18</td>
            <td>,</td>
            <td>Comma</td>
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

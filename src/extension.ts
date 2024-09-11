// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

// 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// 	// This line of code will only be executed once when your extension is activated
// 	console.log('Congratulations, your extension "c-cpp-operator-precedence-helper" is now active!');

// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// 	const disposable = vscode.commands.registerCommand('c-cpp-operator-precedence-helper.table', () => {
// 		// The code you place here will be executed every time your command is executed
// 		// Display a message box to the user
// 		vscode.window.showInformationMessage('Hello World from C/C++ Operator Precedence!');
// 	});

// 	context.subscriptions.push(disposable);
// }

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, "c-cpp-operator-precedence-helper" is now active!');

	const disposable = vscode.commands.registerCommand('c-cpp-operator-precedence-helper.table', () => {
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

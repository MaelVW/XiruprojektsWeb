using System.Globalization;
using System.Text;
using XiruDesktop.Shared;

namespace XiruRechner;

public sealed class CalculatorForm : Form
{
    private readonly TextBox _display = new();
    private readonly Label _status = new();
    private readonly StringBuilder _expression = new();
    private bool _justEvaluated;
    private string _theme = "RGB";

    public CalculatorForm()
    {
        Text = "Xiru Rechner";
        MinimumSize = new Size(350, 500);
        Size = new Size(390, 630);
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;

        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(16), ColumnCount = 4, RowCount = 9 };
        for (var i = 0; i < 4; i++)
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));
        for (var i = 0; i < 5; i++)
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 20));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
        Controls.Add(layout);

        var themeLabel = new Label { Text = "Farbwelt", AutoSize = true, Anchor = AnchorStyles.Left, Tag = "muted" };
        var themes = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Dock = DockStyle.Fill };
        themes.Items.AddRange(Theme.Names);
        themes.SelectedItem = _theme;
        themes.SelectedIndexChanged += (_, _) =>
        {
            _theme = themes.SelectedItem?.ToString() ?? "RGB";
            Theme.Apply(this, _theme);
        };
        layout.Controls.Add(themeLabel, 0, 0);
        layout.Controls.Add(themes, 1, 0);
        layout.SetColumnSpan(themes, 3);

        _display.ReadOnly = true;
        _display.TextAlign = HorizontalAlignment.Right;
        _display.Font = new Font("Segoe UI", 25, FontStyle.Bold);
        _display.Dock = DockStyle.Fill;
        _display.AccessibleName = "Rechenausdruck";
        layout.Controls.Add(_display, 0, 1);
        layout.SetColumnSpan(_display, 4);

        var keys = new[]
        {
            "C", "⌫", "(", ")",
            "7", "8", "9", "÷",
            "4", "5", "6", "×",
            "1", "2", "3", "−",
            "±", "0", ".", "+"
        };
        for (var i = 0; i < keys.Length; i++)
        {
            var key = keys[i];
            var button = new Button { Text = key, Dock = DockStyle.Fill, Margin = new Padding(4), Font = new Font("Segoe UI", 14, FontStyle.Bold), AccessibleName = key };
            button.Click += (_, _) => Press(key);
            layout.Controls.Add(button, i % 4, 2 + i / 4);
        }
        var equals = new Button { Text = "=", Dock = DockStyle.Fill, Margin = new Padding(4), Font = new Font("Segoe UI", 14, FontStyle.Bold), AccessibleName = "Ergebnis" };
        equals.Click += (_, _) => Press("=");
        layout.Controls.Add(equals, 0, 7);
        layout.SetColumnSpan(equals, 4);
        _status.AutoSize = true;
        _status.Text = "Enter = Ergebnis · Esc = Löschen";
        _status.Tag = "muted";
        _status.Dock = DockStyle.Fill;
        _status.TextAlign = ContentAlignment.MiddleLeft;
        layout.Controls.Add(_status, 0, 8);
        layout.SetColumnSpan(_status, 4);

        KeyDown += HandleKeyDown;
        KeyPress += (_, e) =>
        {
            if (char.IsDigit(e.KeyChar) || e.KeyChar is '.' or ',' or '(' or ')')
            {
                Press(e.KeyChar.ToString());
                e.Handled = true;
            }
        };
        Theme.Apply(this, _theme);
    }

    private void HandleKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.Enter)
        {
            Press("="); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Escape)
        {
            Press("C"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Back)
        {
            Press("⌫"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Add || e.KeyCode == Keys.Oemplus && e.Shift)
        {
            Press("+"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Subtract || e.KeyCode == Keys.OemMinus)
        {
            Press("−"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Multiply)
        {
            Press("×"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Divide)
        {
            Press("÷"); e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.Decimal)
        {
            Press("."); e.SuppressKeyPress = true;
        }
    }

    private void Press(string key)
    {
        if (key == "C")
        {
            _expression.Clear();
            _justEvaluated = false;
            _status.Text = "Bereit";
        }
        else if (key == "⌫")
        {
            if (_expression.Length > 0)
                _expression.Length--;
        }
        else if (key == "=")
        {
            try
            {
                var result = new ExpressionParser(_expression.ToString()).Parse();
                _expression.Clear().Append(result.ToString(CultureInfo.CurrentCulture));
                _justEvaluated = true;
                _status.Text = "Ergebnis";
            }
            catch (FormatException)
            {
                _status.Text = "Bitte prüfe den Ausdruck.";
            }
            catch (DivideByZeroException)
            {
                _status.Text = "Division durch null ist nicht definiert.";
            }
        }
        else if (key == "±")
        {
            if (_expression.Length == 0)
                _expression.Append('-');
            else if (_justEvaluated && decimal.TryParse(_expression.ToString(), out var result))
                _expression.Clear().Append((-result).ToString(CultureInfo.CurrentCulture));
            else
                _expression.Append("×(-1)");
            _justEvaluated = false;
        }
        else
        {
            if (_justEvaluated && "0123456789.,".Contains(key, StringComparison.Ordinal))
                _expression.Clear();
            _expression.Append(key switch { "÷" => "/", "×" => "*", "−" => "-", "," => ".", _ => key });
            _justEvaluated = false;
            _status.Text = "Enter = Ergebnis · Esc = Löschen";
        }
        _display.Text = _expression.ToString().Replace("*", " × ").Replace("/", " ÷ ").Replace("-", " − ");
    }

    private sealed class ExpressionParser(string input)
    {
        private readonly string _input = input.Replace(" ", "").Replace(',', '.');
        private int _position;

        public decimal Parse()
        {
            var result = ParseExpression();
            if (_position != _input.Length)
                throw new FormatException();
            return result;
        }

        private decimal ParseExpression()
        {
            var value = ParseTerm();
            while (Take('+') || Take('-'))
            {
                var operation = _input[_position - 1];
                var right = ParseTerm();
                value = operation == '+' ? value + right : value - right;
            }
            return value;
        }

        private decimal ParseTerm()
        {
            var value = ParseUnary();
            while (Take('*') || Take('/'))
            {
                var operation = _input[_position - 1];
                var right = ParseUnary();
                value = operation == '*' ? value * right : right == 0 ? throw new DivideByZeroException() : value / right;
            }
            return value;
        }

        private decimal ParseUnary()
        {
            if (Take('+')) return ParseUnary();
            if (Take('-')) return -ParseUnary();
            if (Take('('))
            {
                var value = ParseExpression();
                if (!Take(')')) throw new FormatException();
                return value;
            }
            return ParseNumber();
        }

        private decimal ParseNumber()
        {
            var start = _position;
            var decimalSeen = false;
            while (_position < _input.Length)
            {
                var ch = _input[_position];
                if (char.IsDigit(ch)) { _position++; continue; }
                if (ch == '.' && !decimalSeen) { decimalSeen = true; _position++; continue; }
                break;
            }
            if (start == _position || !decimal.TryParse(_input.AsSpan(start, _position - start), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value))
                throw new FormatException();
            return value;
        }

        private bool Take(char expected)
        {
            if (_position >= _input.Length || _input[_position] != expected) return false;
            _position++;
            return true;
        }
    }
}

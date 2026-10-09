using XiruDesktop.Shared;

namespace XiruPausenplaner;

public sealed class PausePlannerForm : Form
{
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 1000 };
    private readonly Label _phase = new();
    private readonly Label _clock = new();
    private readonly Label _summary = new();
    private readonly NumericUpDown _workMinutes = new() { Minimum = 5, Maximum = 120, Value = 25, Increment = 5 };
    private readonly NumericUpDown _breakMinutes = new() { Minimum = 1, Maximum = 30, Value = 5 };
    private readonly Button _startPause = new() { Text = "Arbeit starten" };
    private TimeSpan _remaining = TimeSpan.FromMinutes(25);
    private bool _working = true;
    private bool _running;
    private int _completed;
    private int _workedSeconds;

    public PausePlannerForm()
    {
        Text = "Xiru Pausenplaner";
        MinimumSize = new Size(380, 410);
        Size = new Size(460, 500);
        StartPosition = FormStartPosition.CenterScreen;

        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(24), ColumnCount = 2, RowCount = 7 };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 52));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 48));
        Controls.Add(layout);

        _phase.Text = "FOKUSZEIT";
        _phase.TextAlign = ContentAlignment.MiddleCenter;
        _phase.Dock = DockStyle.Fill;
        _phase.Font = new Font("Segoe UI", 11, FontStyle.Bold);
        layout.Controls.Add(_phase, 0, 0);
        layout.SetColumnSpan(_phase, 2);

        _clock.Text = "25:00";
        _clock.TextAlign = ContentAlignment.MiddleCenter;
        _clock.Dock = DockStyle.Fill;
        _clock.Font = new Font("Segoe UI", 52, FontStyle.Bold);
        layout.Controls.Add(_clock, 0, 1);
        layout.SetColumnSpan(_clock, 2);

        var workLabel = new Label { Text = "Fokus (Minuten)", TextAlign = ContentAlignment.MiddleLeft, Dock = DockStyle.Fill };
        var breakLabel = new Label { Text = "Pause (Minuten)", TextAlign = ContentAlignment.MiddleLeft, Dock = DockStyle.Fill };
        layout.Controls.Add(workLabel, 0, 2); layout.Controls.Add(_workMinutes, 1, 2);
        layout.Controls.Add(breakLabel, 0, 3); layout.Controls.Add(_breakMinutes, 1, 3);
        _workMinutes.Dock = _breakMinutes.Dock = DockStyle.Fill;
        _workMinutes.ValueChanged += (_, _) => ResetTimer();
        _breakMinutes.ValueChanged += (_, _) => ResetTimer();

        _startPause.Dock = DockStyle.Fill;
        _startPause.Click += (_, _) => ToggleTimer();
        layout.Controls.Add(_startPause, 0, 4);
        var reset = new Button { Text = "Zurücksetzen", Dock = DockStyle.Fill };
        reset.Click += (_, _) => ResetTimer();
        layout.Controls.Add(reset, 1, 4);

        _summary.Text = "Fokuszeit dieser Sitzung: 00:00:00 · Blöcke: 0";
        _summary.TextAlign = ContentAlignment.MiddleCenter;
        _summary.Dock = DockStyle.Fill;
        _summary.Tag = "muted";
        layout.Controls.Add(_summary, 0, 6);
        layout.SetColumnSpan(_summary, 2);

        _timer.Tick += (_, _) => Tick();
        FormClosed += (_, _) => _timer.Dispose();
        Theme.Apply(this, "Nacht");
        RefreshClock();
    }

    private void ToggleTimer()
    {
        _running = !_running;
        _startPause.Text = _running ? "Pausieren" : (_working ? "Arbeit fortsetzen" : "Pause fortsetzen");
        if (_running) _timer.Start(); else _timer.Stop();
    }

    private void ResetTimer()
    {
        _timer.Stop();
        _running = false;
        _working = true;
        _remaining = TimeSpan.FromMinutes((double)_workMinutes.Value);
        _phase.Text = "FOKUSZEIT";
        _startPause.Text = "Arbeit starten";
        RefreshClock();
    }

    private void Tick()
    {
        if (_remaining > TimeSpan.Zero)
        {
            _remaining -= TimeSpan.FromSeconds(1);
            if (_working)
            {
                _workedSeconds++;
                RefreshSummary();
            }
            RefreshClock();
            return;
        }

        _timer.Stop();
        _running = false;
        if (_working)
        {
            _completed++;
            RefreshSummary();
            _working = false;
            _remaining = TimeSpan.FromMinutes((double)_breakMinutes.Value);
            _phase.Text = "PAUSENZEIT";
            _startPause.Text = "Pause starten";
            System.Media.SystemSounds.Exclamation.Play();
            using var alert = new BreakAlertForm();
            alert.ShowDialog(this);
        }
        else
        {
            _working = true;
            _remaining = TimeSpan.FromMinutes((double)_workMinutes.Value);
            _phase.Text = "FOKUSZEIT";
            _startPause.Text = "Arbeit starten";
            System.Media.SystemSounds.Asterisk.Play();
        }
        RefreshClock();
    }

    private void RefreshClock() => _clock.Text = $"{(int)_remaining.TotalMinutes:00}:{_remaining.Seconds:00}";
    private void RefreshSummary()
    {
        var hours = _workedSeconds / 3600;
        var minutes = _workedSeconds % 3600 / 60;
        var seconds = _workedSeconds % 60;
        _summary.Text = $"Fokuszeit dieser Sitzung: {hours:00}:{minutes:00}:{seconds:00} · Blöcke: {_completed}";
    }

    private sealed class BreakAlertForm : Form
    {
        public BreakAlertForm()
        {
            Text = "Zeit für eine Pause";
            Size = new Size(380, 180);
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;

            var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(18), RowCount = 3 };
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            Controls.Add(layout);
            var title = new Label { Text = "Fokusblock geschafft!", Dock = DockStyle.Fill, Font = new Font("Segoe UI", 13, FontStyle.Bold) };
            var message = new Label { Text = "Steh kurz auf, trink etwas Wasser und gönn deinen Augen eine Pause.", Dock = DockStyle.Fill, Tag = "muted" };
            var button = new Button { Text = "Alles klar", Dock = DockStyle.Right, Width = 110, DialogResult = DialogResult.OK };
            layout.Controls.Add(title, 0, 0); layout.Controls.Add(message, 0, 1); layout.Controls.Add(button, 0, 2);
            AcceptButton = button;
            Theme.Apply(this, "Nacht");
        }
    }
}

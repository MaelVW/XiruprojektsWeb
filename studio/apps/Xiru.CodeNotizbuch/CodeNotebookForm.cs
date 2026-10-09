using System.Text.Json;
using XiruDesktop.Shared;

namespace XiruCodeNotizbuch;

public sealed class CodeNotebookForm : Form
{
    private readonly string _notesDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "XiruProjects", "CodeNotizbuch");
    private readonly ListBox _notes = new();
    private readonly TextBox _title = new();
    private readonly TextBox _editor = new();
    private readonly ComboBox _language = new();
    private readonly Label _status = new();
    private readonly System.Windows.Forms.Timer _saveTimer = new() { Interval = 450 };
    private List<Note> _items = [];
    private Note? _selected;
    private bool _loading;

    public CodeNotebookForm()
    {
        Text = "Xiru Code-Notizbuch";
        MinimumSize = new Size(760, 520);
        Size = new Size(1000, 700);
        StartPosition = FormStartPosition.CenterScreen;
        Directory.CreateDirectory(_notesDirectory);

        var root = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(12), ColumnCount = 2, RowCount = 1 };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 230));
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Controls.Add(root);

        var side = new TableLayoutPanel { Dock = DockStyle.Fill, RowCount = 3, Padding = new Padding(0, 0, 10, 0) };
        side.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        side.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        side.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        root.Controls.Add(side, 0, 0);
        var sideButtons = new FlowLayoutPanel { Dock = DockStyle.Fill, WrapContents = false };
        var add = new Button { Text = "+ Neu", Width = 95, Height = 32 };
        var remove = new Button { Text = "Löschen", Width = 95, Height = 32 };
        add.Click += (_, _) => CreateNote();
        remove.Click += (_, _) => DeleteNote();
        sideButtons.Controls.Add(add); sideButtons.Controls.Add(remove);
        side.Controls.Add(sideButtons, 0, 0);

        _notes.Dock = DockStyle.Fill;
        _notes.IntegralHeight = false;
        _notes.SelectedIndexChanged += (_, _) => SelectNote();
        side.Controls.Add(_notes, 0, 1);

        var content = new TableLayoutPanel { Dock = DockStyle.Fill, RowCount = 4 };
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        content.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        root.Controls.Add(content, 1, 0);

        var titleRow = new FlowLayoutPanel { Dock = DockStyle.Fill, WrapContents = false };
        _title.Width = 390; _title.PlaceholderText = "Notiztitel";
        _language.DropDownStyle = ComboBoxStyle.DropDownList;
        _language.Items.AddRange(["C#", "JavaScript", "Python", "HTML", "CSS", "SQL", "Markdown", "Text"]);
        _language.SelectedItem = "C#";
        titleRow.Controls.Add(_title); titleRow.Controls.Add(_language);
        content.Controls.Add(titleRow, 0, 0);
        _title.TextChanged += (_, _) => ScheduleSave();
        _language.SelectedIndexChanged += (_, _) => ScheduleSave();

        var actions = new FlowLayoutPanel { Dock = DockStyle.Fill, WrapContents = false };
        var copy = new Button { Text = "Code kopieren", Width = 130 };
        var export = new Button { Text = "Exportieren …", Width = 130 };
        copy.Click += (_, _) => CopyCode();
        export.Click += (_, _) => ExportNote();
        actions.Controls.Add(copy); actions.Controls.Add(export);
        content.Controls.Add(actions, 0, 1);

        _editor.Dock = DockStyle.Fill;
        _editor.Multiline = true;
        _editor.AcceptsTab = true;
        _editor.AcceptsReturn = true;
        _editor.WordWrap = false;
        _editor.ScrollBars = ScrollBars.Both;
        _editor.Font = new Font("Consolas", 11);
        _editor.TextChanged += (_, _) => { UpdateStatus(); ScheduleSave(); };
        content.Controls.Add(_editor, 0, 2);

        _status.Dock = DockStyle.Fill;
        _status.TextAlign = ContentAlignment.MiddleLeft;
        _status.Tag = "muted";
        content.Controls.Add(_status, 0, 3);
        _saveTimer.Tick += (_, _) => { _saveTimer.Stop(); SaveSelected(); };
        FormClosing += (_, _) => SaveSelected();

        Theme.Apply(this, "Nacht");
        LoadNotes();
        if (_items.Count == 0) CreateNote();
        else SelectIndex(0);
    }

    private void LoadNotes()
    {
        foreach (var path in Directory.EnumerateFiles(_notesDirectory, "*.json"))
        {
            try
            {
                var note = JsonSerializer.Deserialize<Note>(File.ReadAllText(path));
                if (note is not null && !string.IsNullOrWhiteSpace(note.Id))
                    _items.Add(note);
            }
            catch (JsonException)
            {
                _status.Text = $"Eine Notizdatei ist beschädigt und wurde übersprungen: {Path.GetFileName(path)}";
            }
            catch (IOException ex)
            {
                _status.Text = $"Notiz konnte nicht gelesen werden: {ex.Message}";
            }
        }
        _items = _items.OrderByDescending(note => note.UpdatedAt).ToList();
        RefreshList();
    }

    private void CreateNote()
    {
        SaveSelected();
        var note = new Note { Id = Guid.NewGuid().ToString("N"), Title = "Neue Notiz", Language = "C#", UpdatedAt = DateTimeOffset.Now };
        _items.Insert(0, note);
        RefreshList();
        SelectIndex(0);
        _title.SelectAll();
        _title.Focus();
        SaveSelected();
    }

    private void DeleteNote()
    {
        if (_selected is null) return;
        var confirm = MessageBox.Show(this, $"„{_selected.Title}“ wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.",
            "Notiz löschen", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
        if (confirm != DialogResult.Yes) return;
        var path = NotePath(_selected.Id);
        if (File.Exists(path)) File.Delete(path);
        _items.Remove(_selected);
        _selected = null;
        RefreshList();
        if (_items.Count == 0) CreateNote(); else SelectIndex(0);
    }

    private void SelectNote()
    {
        if (_loading || _notes.SelectedItem is not Note note || note == _selected) return;
        SaveSelected();
        _selected = note;
        _loading = true;
        _notes.SelectedItem = note;
        _title.Text = note.Title;
        _editor.Text = note.Content;
        _language.SelectedItem = _language.Items.Contains(note.Language) ? note.Language : "Text";
        _loading = false;
        UpdateStatus();
    }

    private void SelectIndex(int index)
    {
        if (_notes.Items.Count == 0) return;
        _notes.SelectedIndex = Math.Clamp(index, 0, _notes.Items.Count - 1);
    }

    private void ScheduleSave()
    {
        if (_loading || _selected is null) return;
        _status.Text = "Änderungen werden lokal gespeichert …";
        _saveTimer.Stop();
        _saveTimer.Start();
    }

    private void SaveSelected()
    {
        if (_loading || _selected is null) return;
        _saveTimer.Stop();
        _selected.Title = string.IsNullOrWhiteSpace(_title.Text) ? "Unbenannte Notiz" : _title.Text.Trim();
        _selected.Language = _language.SelectedItem?.ToString() ?? "Text";
        _selected.Content = _editor.Text;
        _selected.UpdatedAt = DateTimeOffset.Now;
        try
        {
            var tempPath = NotePath(_selected.Id) + ".tmp";
            File.WriteAllText(tempPath, JsonSerializer.Serialize(_selected, new JsonSerializerOptions { WriteIndented = true }));
            File.Move(tempPath, NotePath(_selected.Id), true);
            _status.Text = "Lokal gespeichert · " + _selected.UpdatedAt.ToString("HH:mm:ss");
            _notes.Refresh();
        }
        catch (IOException ex)
        {
            _status.Text = "Speichern fehlgeschlagen: " + ex.Message;
        }
    }

    private void RefreshList()
    {
        var selected = _selected;
        _loading = true;
        _notes.BeginUpdate();
        _notes.Items.Clear();
        foreach (var note in _items.OrderByDescending(item => item.UpdatedAt))
            _notes.Items.Add(note);
        _notes.EndUpdate();
        if (selected is not null) _notes.SelectedItem = selected;
        _loading = false;
    }

    private void UpdateStatus()
    {
        var lines = _editor.Text.Length == 0 ? 0 : _editor.Lines.Length;
        _status.Text = $"{_language.SelectedItem ?? "Text"} · {lines} Zeilen · {_editor.Text.Length} Zeichen · lokal";
    }

    private void CopyCode()
    {
        if (_editor.TextLength == 0) return;
        Clipboard.SetText(_editor.Text);
        _status.Text = "In die Zwischenablage kopiert.";
    }

    private void ExportNote()
    {
        if (_selected is null) return;
        using var dialog = new SaveFileDialog
        {
            FileName = MakeSafeFileName(_title.Text) + ExtensionFor(_language.SelectedItem?.ToString()),
            Filter = "Alle Dateien (*.*)|*.*|Textdateien (*.txt)|*.txt"
        };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            File.WriteAllText(dialog.FileName, _editor.Text);
            _status.Text = "Exportiert nach " + dialog.FileName;
        }
        catch (IOException ex)
        {
            MessageBox.Show(this, "Datei konnte nicht geschrieben werden:\n" + ex.Message, "Export fehlgeschlagen", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private string NotePath(string id) => Path.Combine(_notesDirectory, id + ".json");
    private static string MakeSafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var safe = new string(value.Where(ch => !invalid.Contains(ch)).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(safe) ? "code-notiz" : safe;
    }
    private static string ExtensionFor(string? language) => language switch
    {
        "C#" => ".cs", "JavaScript" => ".js", "Python" => ".py", "HTML" => ".html",
        "CSS" => ".css", "SQL" => ".sql", "Markdown" => ".md", _ => ".txt"
    };

    private sealed class Note
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Language { get; set; } = "C#";
        public string Content { get; set; } = "";
        public DateTimeOffset UpdatedAt { get; set; }
        public override string ToString() => string.IsNullOrWhiteSpace(Title) ? "Unbenannte Notiz" : Title;
    }
}

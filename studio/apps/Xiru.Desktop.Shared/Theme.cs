namespace XiruDesktop.Shared;

public static class Theme
{
    private sealed record Palette(Color Background, Color Surface, Color Foreground, Color Muted, Color Accent);

    private static readonly IReadOnlyDictionary<string, Palette> Palettes =
        new Dictionary<string, Palette>(StringComparer.OrdinalIgnoreCase)
        {
            ["RGB"] = new(Color.FromArgb(13, 12, 22), Color.FromArgb(29, 24, 43), Color.FromArgb(246, 239, 255), Color.FromArgb(187, 174, 219), Color.FromArgb(255, 61, 242)),
            ["Nacht"] = new(Color.FromArgb(11, 14, 26), Color.FromArgb(25, 31, 51), Color.FromArgb(232, 235, 247), Color.FromArgb(155, 166, 195), Color.FromArgb(94, 234, 212)),
            ["CRT"] = new(Color.FromArgb(18, 13, 8), Color.FromArgb(39, 28, 17), Color.FromArgb(255, 226, 180), Color.FromArgb(194, 164, 126), Color.FromArgb(255, 179, 71)),
            ["PIXMAG"] = new(Color.FromArgb(24, 19, 17), Color.FromArgb(45, 35, 31), Color.FromArgb(239, 226, 207), Color.FromArgb(186, 165, 145), Color.FromArgb(196, 75, 52)),
            ["Hell"] = new(Color.FromArgb(244, 246, 250), Color.White, Color.FromArgb(26, 31, 48), Color.FromArgb(92, 101, 122), Color.FromArgb(13, 148, 136))
        };

    public static string[] Names => Palettes.Keys.ToArray();

    public static void Apply(Control root, string name)
    {
        if (!Palettes.TryGetValue(name, out var palette))
            palette = Palettes["Nacht"];
        ApplyControl(root, palette, root);
    }

    private static void ApplyControl(Control control, Palette palette, Control root)
    {
        control.ForeColor = palette.Foreground;
        control.BackColor = control == root || control is Panel or GroupBox or TabPage
            ? palette.Background
            : palette.Surface;

        if (control is Button button)
        {
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderColor = palette.Accent;
            button.FlatAppearance.MouseOverBackColor = ControlPaint.Light(palette.Surface, .12f);
            button.BackColor = palette.Surface;
        }
        else if (control is Label label && label.Tag as string == "muted")
        {
            label.ForeColor = palette.Muted;
            label.BackColor = Color.Transparent;
        }
        else if (control is TextBoxBase textBox)
        {
            textBox.BorderStyle = BorderStyle.FixedSingle;
        }

        foreach (Control child in control.Controls)
            ApplyControl(child, palette, root);
    }
}

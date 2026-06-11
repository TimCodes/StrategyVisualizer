// ─────────────────────────────────────────────────────────────
// lean-docker-shim.cs — tiny Windows launcher for lean-docker.ps1
//
// WHY THIS EXISTS
// The Praxis server (packages/server/services/lean-runner.ts) spawns
// LEAN_COMMAND with Node's spawn(..., { shell: false }). Since Node
// 20.12 (CVE-2024-27980 fix), spawning a .cmd/.bat file with
// shell:false throws EINVAL, and .ps1 files are not directly
// executable — so on Windows LEAN_COMMAND must point at a real .exe.
// This shim simply launches PowerShell on the lean-docker.ps1 sitting
// next to it, forwarding all arguments, inheriting stdio, and passing
// the exit code through.
//
// BUILD (no SDK needed — csc.exe ships with the .NET Framework on
// every Windows 10/11 machine):
//   npm run build:shim          (from packages/lean-engine)
// which runs:
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
//     /nologo /optimize /out:bin\lean-docker.exe bin\lean-docker-shim.cs
// ─────────────────────────────────────────────────────────────
using System;
using System.Diagnostics;
using System.IO;
using System.Text;

static class LeanDockerShim
{
    static int Main(string[] args)
    {
        string exeDir = Path.GetDirectoryName(
            System.Reflection.Assembly.GetExecutingAssembly().Location);
        string script = Path.Combine(exeDir, "lean-docker.ps1");
        if (!File.Exists(script))
        {
            Console.Error.WriteLine("lean-docker shim: script not found: " + script);
            return 1;
        }

        var sb = new StringBuilder("-NoProfile -ExecutionPolicy Bypass -File ");
        sb.Append(Quote(script));
        foreach (string a in args)
        {
            sb.Append(' ').Append(Quote(a));
        }

        var psi = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = sb.ToString(),
            UseShellExecute = false
            // stdio are inherited by default, so lean's stdout/stderr flow
            // straight through to the Node process that spawned this shim.
        };

        try
        {
            using (Process p = Process.Start(psi))
            {
                p.WaitForExit();
                return p.ExitCode;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("lean-docker shim: failed to start powershell: " + ex.Message);
            return 1;
        }
    }

    // Standard Windows command-line argument quoting (handles spaces,
    // quotes and trailing backslashes).
    static string Quote(string s)
    {
        if (s.Length > 0 && s.IndexOfAny(new[] { ' ', '\t', '"' }) < 0)
        {
            return s;
        }
        var sb = new StringBuilder("\"");
        int backslashes = 0;
        foreach (char c in s)
        {
            if (c == '\\') { backslashes++; continue; }
            if (c == '"')
            {
                sb.Append('\\', backslashes * 2 + 1);
                backslashes = 0;
                sb.Append('"');
                continue;
            }
            if (backslashes > 0) { sb.Append('\\', backslashes); backslashes = 0; }
            sb.Append(c);
        }
        if (backslashes > 0) sb.Append('\\', backslashes * 2);
        sb.Append('"');
        return sb.ToString();
    }
}

using System;
using System.IO;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace BDHosttPOSPrinterInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            if (args != null && args.Length > 0 && (args[0].Equals("/silent", StringComparison.OrdinalIgnoreCase) || args[0].Equals("/s", StringComparison.OrdinalIgnoreCase)))
            {
                InstallerForm form = new InstallerForm();
                form.RunSilentInstallation();
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblHeader;
        private Label lblSubHeader;
        private Button btnAction;
        private Panel pnlHeader;
        private Panel pnlBody;
        private Label lblDetails;
        private string installDir;
        private string appUrl = "https://posdemo.bdhostt.com";

        public InstallerForm()
        {
            InitializeComponent();
            installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BDHosttPOSDEMOPrinter");
        }

        private void InitializeComponent()
        {
            this.Text = "BD HOSTT POS - Printer Bridge 1-Click Setup";
            this.Size = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Header Panel
            pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 80;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42); // slate-900

            lblHeader = new Label();
            lblHeader.Text = "BD HOSTT POS • PRINTER BRIDGE";
            lblHeader.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblHeader.ForeColor = Color.FromArgb(248, 250, 252);
            lblHeader.Location = new Point(20, 16);
            lblHeader.AutoSize = true;

            lblSubHeader = new Label();
            lblSubHeader.Text = "1-Click Direct USB & LAN Thermal Hardware Setup";
            lblSubHeader.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubHeader.ForeColor = Color.FromArgb(148, 163, 184); // slate-400
            lblSubHeader.Location = new Point(21, 44);
            lblSubHeader.AutoSize = true;

            pnlHeader.Controls.Add(lblHeader);
            pnlHeader.Controls.Add(lblSubHeader);

            // Body Panel
            pnlBody = new Panel();
            pnlBody.Dock = DockStyle.Fill;
            pnlBody.Padding = new Padding(25, 20, 25, 20);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install BD HOSTT POS Thermal Printer Bridge...";
            lblStatus.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(30, 41, 59);
            lblStatus.Location = new Point(25, 100);
            lblStatus.Size = new Size(475, 25);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(25, 130);
            progressBar.Size = new Size(475, 22);
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;

            lblDetails = new Label();
            lblDetails.Text = "Click 'Install Now' to install the background print service.\nIt will configure automatic Windows startup and desktop control shortcuts.";
            lblDetails.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblDetails.ForeColor = Color.FromArgb(100, 116, 139);
            lblDetails.Location = new Point(25, 165);
            lblDetails.Size = new Size(475, 135);

            btnAction = new Button();
            btnAction.Text = "Install Now";
            btnAction.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnAction.BackColor = Color.FromArgb(0, 75, 155); // #004b9b
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Location = new Point(360, 315);
            btnAction.Size = new Size(140, 38);
            btnAction.Cursor = Cursors.Hand;
            btnAction.Click += new EventHandler(BtnAction_Click);

            this.Controls.Add(btnAction);
            this.Controls.Add(lblDetails);
            this.Controls.Add(progressBar);
            this.Controls.Add(lblStatus);
            this.Controls.Add(pnlHeader);
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (btnAction.Text == "Finish" || btnAction.Text == "Close")
            {
                this.Close();
                return;
            }

            btnAction.Enabled = false;
            btnAction.Text = "Installing...";

            Thread installThread = new Thread(new ThreadStart(PerformInstallation));
            installThread.IsBackground = true;
            installThread.Start();
        }

        private void UpdateStatus(string status, string details = "")
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<string, string>(UpdateStatus), status, details);
                return;
            }

            lblStatus.Text = status;
            if (!string.IsNullOrEmpty(details))
            {
                lblDetails.Text = details;
            }
        }

        public void RunSilentInstallation()
        {
            try
            {
                if (!IsNodeInstalled())
                {
                    TryInstallNodeViaWinget();
                }
                StopExistingAgent();
                if (!Directory.Exists(installDir)) Directory.CreateDirectory(installDir);
                string scriptsDir = Path.Combine(installDir, "scripts");
                if (!Directory.Exists(scriptsDir)) Directory.CreateDirectory(scriptsDir);
                ExtractEmbeddedPayload();
                CreateShortcuts();
                StartAgentSilently();
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText(Path.Combine(installDir, "install_silent_error.log"), ex.ToString());
                }
                catch {}
            }
        }

        private void PerformInstallation()
        {
            try
            {
                // 1. Check Node.js
                UpdateStatus("Checking Node.js environment...", "Verifying if Node.js runtime is installed on this PC...");
                if (!IsNodeInstalled())
                {
                    UpdateStatus("Node.js not detected!", "Node.js is required to bridge web POS printing to hardware thermal printers.\nAttempting automatic installation via winget...");
                    bool wingetSuccess = TryInstallNodeViaWinget();
                    if (!wingetSuccess && !IsNodeInstalled())
                    {
                        DialogResult dr = MessageBox.Show(
                            "Node.js is required to run the local thermal printer bridge.\n\nWould you like to open the official Node.js download page?",
                            "Node.js Required",
                            MessageBoxButtons.YesNo,
                            MessageBoxIcon.Warning
                        );
                        if (dr == DialogResult.Yes)
                        {
                            Process.Start("https://nodejs.org/en/download/");
                        }
                        SetFinished(false, "Node.js was not found. Please install Node.js and run this setup again.");
                        return;
                    }
                }

                // 2. Stop older instances
                UpdateStatus("Stopping any existing print agent...", "Ensuring port 9123 is free for the updated bridge...");
                StopExistingAgent();

                // 3. Extract Payload.zip to installDir
                UpdateStatus("Deploying printer bridge files...", "Extracting bridge files to " + installDir);
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                string scriptsDir = Path.Combine(installDir, "scripts");
                if (!Directory.Exists(scriptsDir))
                {
                    Directory.CreateDirectory(scriptsDir);
                }

                ExtractEmbeddedPayload();

                // 4. Create Desktop Shortcuts & Startup
                UpdateStatus("Creating Desktop Shortcuts & Auto-Start...", "Setting up 'Start Printer Agent' and 'Stop Printer Agent'...");
                CreateShortcuts();

                // 5. Start the agent silently in background
                UpdateStatus("Starting Printer Agent in background...", "Launching background printer listener on port 9123...");
                StartAgentSilently();

                Thread.Sleep(1000);
                SetFinished(true, "Installation completed successfully!\n\n" +
                    "• The Printer Bridge is running silently in the background.\n" +
                    "• It will automatically start every time Windows turns on.\n" +
                    "• Unified Desktop Controller created:\n" +
                    "    🖨️ BD Hostt Printer Bridge\n" +
                    "• In-app Start & Stop controls active in your Web POS screen.");
            }
            catch (Exception ex)
            {
                SetFinished(false, "An error occurred during installation:\n" + ex.Message);
            }
        }

        private void SetFinished(bool success, string message)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<bool, string>(SetFinished), success, message);
                return;
            }

            progressBar.Style = ProgressBarStyle.Blocks;
            progressBar.Value = success ? 100 : 0;

            if (success)
            {
                lblStatus.Text = "✓ Printer Bridge Ready & Active!";
                lblStatus.ForeColor = Color.FromArgb(4, 120, 87); // emerald-700
                lblDetails.Text = message;
                btnAction.Text = "Finish";
                btnAction.BackColor = Color.FromArgb(5, 150, 105);
                btnAction.Enabled = true;
            }
            else
            {
                lblStatus.Text = "Installation Encountered an Issue";
                lblStatus.ForeColor = Color.FromArgb(220, 38, 38);
                lblDetails.Text = message;
                btnAction.Text = "Close";
                btnAction.BackColor = Color.FromArgb(100, 116, 139);
                btnAction.Enabled = true;
            }
        }

        private bool IsNodeInstalled()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("where.exe", "node");
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(3000);
                    return p.ExitCode == 0;
                }
            }
            catch
            {
                string programFilesNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                return File.Exists(programFilesNode);
            }
        }

        private bool TryInstallNodeViaWinget()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("winget", "install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements");
                psi.UseShellExecute = true;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(60000);
                    return p.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        private void StopExistingAgent()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -Command \"Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { ($_.Name -match '^(node|wscript)\\.exe$') -and ($_.CommandLine -match 'print-agent\\.cjs|run-printer-silent\\.vbs|start-printer-agent\\.bat') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }\"");
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(4000);
                }
            }
            catch {}
        }

        private void ExtractEmbeddedPayload()
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            string resourceName = null;
            foreach (string name in asm.GetManifestResourceNames())
            {
                if (name.EndsWith("Payload.zip", StringComparison.OrdinalIgnoreCase) || name.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase))
                {
                    resourceName = name;
                    break;
                }
            }

            if (string.IsNullOrEmpty(resourceName))
            {
                throw new FileNotFoundException("Embedded installer payload resource not found.");
            }

            string tempZip = Path.Combine(Path.GetTempPath(), "pos_printer_payload_" + Guid.NewGuid().ToString("N") + ".zip");
            try
            {
                using (Stream stream = asm.GetManifestResourceStream(resourceName))
                using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                {
                    byte[] buffer = new byte[81920];
                    int read;
                    while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        fs.Write(buffer, 0, read);
                    }
                }

                // Extract zip into installDir using PowerShell for maximum cross-Windows compatibility
                ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", string.Format("-NoProfile -ExecutionPolicy Bypass -Command \"Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force\"", tempZip, installDir));
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(15000);
                }
            }
            finally
            {
                if (File.Exists(tempZip))
                {
                    try { File.Delete(tempZip); } catch {}
                }
            }

            // Ensure .env has target URL
            string envFile = Path.Combine(installDir, ".env");
            if (!File.Exists(envFile))
            {
                File.WriteAllText(envFile, "APP_URL=" + appUrl + "\r\nPORT=3000\r\n");
            }
        }

        private void CreateShortcuts()
        {
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string startupDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Microsoft\Windows\Start Menu\Programs\Startup");
            string vbsPath = Path.Combine(installDir, "run-printer-silent.vbs");
            string ctrlExe = Path.Combine(installDir, "PrinterControl.exe");

            // Clean legacy or separate shortcuts
            string[] legacyFiles = new string[] {
                Path.Combine(desktopDir, "POS DEMO Printer Agent.lnk"),
                Path.Combine(startupDir, "POSPrinterAgent.lnk"),
                Path.Combine(desktopDir, "Start Printer Agent.lnk"),
                Path.Combine(desktopDir, "Stop Printer Agent.lnk")
            };
            foreach (string leg in legacyFiles)
            {
                try { if (File.Exists(leg)) File.Delete(leg); } catch {}
            }

            // Register posbridge:// URL protocol
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\posbridge"))
                {
                    key.SetValue("", "URL:BD Hostt POS Printer Bridge Protocol");
                    key.SetValue("URL Protocol", "");
                    using (RegistryKey cmdKey = key.CreateSubKey(@"shell\open\command"))
                    {
                        string targetApp = File.Exists(ctrlExe) ? ctrlExe : vbsPath;
                        cmdKey.SetValue("", "\"" + targetApp + "\" \"%1\"");
                    }
                }
            }
            catch {}

            // 1. Direct COM invoke via WScript.Shell
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    object shell = Activator.CreateInstance(shellType);

                    // 1a. Windows Startup Shortcut (Background auto-start)
                    string startupShortcutPath = Path.Combine(startupDir, "POSDEMOPrinterAgent.lnk");
                    CreateLnk(shell, startupShortcutPath, "wscript.exe", "\"" + vbsPath + "\"", installDir, "imageres.dll,46", "BD HOSTT POS Thermal Printer Background Agent");

                    // 1b. Single Unified Desktop Controller Shortcut
                    string singleDesktopShortcut = Path.Combine(desktopDir, "BD Hostt Printer Bridge.lnk");
                    string target = File.Exists(ctrlExe) ? ctrlExe : "wscript.exe";
                    string args = File.Exists(ctrlExe) ? "" : ("\"" + vbsPath + "\"");
                    CreateLnk(shell, singleDesktopShortcut, target, args, installDir, "imageres.dll,46", "BD HOSTT POS Thermal Printer Bridge Controller");
                }
            }
            catch {}

            // 2. Guaranteed fallback via PowerShell setup-autostart.ps1
            try
            {
                string ps1 = Path.Combine(installDir, @"scripts\setup-autostart.ps1");
                if (File.Exists(ps1))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", string.Format("-NoProfile -ExecutionPolicy Bypass -File \"{0}\"", ps1));
                    psi.WorkingDirectory = installDir;
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    using (Process p = Process.Start(psi))
                    {
                        p.WaitForExit(10000);
                    }
                }
            }
            catch {}
        }

        private void CreateLnk(object shell, string shortcutPath, string targetPath, string arguments, string workingDir, string iconLocation, string description)
        {
            try
            {
                object shortcut = shell.GetType().InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                if (shortcut == null) return;

                shortcut.GetType().InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                if (!string.IsNullOrEmpty(arguments))
                {
                    shortcut.GetType().InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments });
                }
                shortcut.GetType().InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                if (!string.IsNullOrEmpty(iconLocation))
                {
                    string systemRoot = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
                    string fullIcon = iconLocation.Replace("%SystemRoot%", systemRoot);
                    if (!fullIcon.Contains(":\\"))
                    {
                        fullIcon = Path.Combine(systemRoot, "System32", iconLocation);
                    }
                    shortcut.GetType().InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { fullIcon });
                }
                shortcut.GetType().InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
                shortcut.GetType().InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch {}
        }

        private void StartAgentSilently()
        {
            string vbsPath = Path.Combine(installDir, "run-printer-silent.vbs");
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("wscript.exe", "\"" + vbsPath + "\"");
                psi.WorkingDirectory = installDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                Process.Start(psi);
            }
            catch {}
        }
    }
}

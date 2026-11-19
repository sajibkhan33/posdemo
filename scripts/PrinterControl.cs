using System;
using System.Drawing;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Windows.Forms;
using Microsoft.Win32;

namespace BDHosttPOSPrinterControl
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            RegisterProtocol();

            if (args != null && args.Length > 0)
            {
                string arg = args[0].ToLowerInvariant();
                if (arg == "/start" || arg.Contains("posbridge://start") || arg.Contains("posbridge://"))
                {
                    StartService();
                    return;
                }
                if (arg == "/stop" || arg.Contains("posbridge://stop"))
                {
                    StopService();
                    return;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new ControlForm());
        }

        public static void RegisterProtocol()
        {
            try
            {
                string exePath = Application.ExecutablePath;
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\posbridge"))
                {
                    key.SetValue("", "URL:BD Hostt POS Printer Bridge Protocol");
                    key.SetValue("URL Protocol", "");
                    using (RegistryKey cmdKey = key.CreateSubKey(@"shell\open\command"))
                    {
                        cmdKey.SetValue("", "\"" + exePath + "\" \"%1\"");
                    }
                }
            }
            catch {}
        }

        public static bool IsServiceRunning()
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult ar = client.BeginConnect("127.0.0.1", 9123, null, null);
                    bool success = ar.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    client.EndConnect(ar);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        public static void StartService()
        {
            try
            {
                if (IsServiceRunning()) return;

                string baseDir = Path.GetDirectoryName(Application.ExecutablePath);
                string vbs = Path.Combine(baseDir, "run-printer-silent.vbs");
                if (File.Exists(vbs))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("wscript.exe", "\"" + vbs + "\"");
                    psi.WorkingDirectory = baseDir;
                    psi.UseShellExecute = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process.Start(psi);
                }
            }
            catch {}
        }

        public static void StopService()
        {
            try
            {
                string baseDir = Path.GetDirectoryName(Application.ExecutablePath);
                string ps1 = Path.Combine(baseDir, @"scripts\stop-agent.ps1");
                if (File.Exists(ps1))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", string.Format("-NoProfile -ExecutionPolicy Bypass -File \"{0}\"", ps1));
                    psi.WorkingDirectory = baseDir;
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    using (Process p = Process.Start(psi))
                    {
                        p.WaitForExit(4000);
                    }
                }
            }
            catch {}
        }
    }

    public class ControlForm : Form
    {
        private Panel pnlHeader;
        private Label lblHeader;
        private Label lblSubHeader;
        private Panel pnlStatusBox;
        private Label lblStatus;
        private Label lblDetails;
        private Button btnToggle;
        private Button btnOpenWeb;
        private Timer refreshTimer;

        public ControlForm()
        {
            InitializeComponent();
            UpdateUIState();
        }

        private void InitializeComponent()
        {
            this.Text = "BD HOSTT POS • Printer Bridge Controller";
            this.Size = new Size(420, 310);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Header Panel
            pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 70;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42); // slate-900

            lblHeader = new Label();
            lblHeader.Text = "BD HOSTT POS • PRINTER BRIDGE";
            lblHeader.Font = new Font("Segoe UI", 11.5F, FontStyle.Bold);
            lblHeader.ForeColor = Color.FromArgb(248, 250, 252);
            lblHeader.Location = new Point(20, 14);
            lblHeader.AutoSize = true;

            lblSubHeader = new Label();
            lblSubHeader.Text = "Thermal Printer Hardware Service Control";
            lblSubHeader.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblSubHeader.ForeColor = Color.FromArgb(148, 163, 184);
            lblSubHeader.Location = new Point(21, 38);
            lblSubHeader.AutoSize = true;

            pnlHeader.Controls.Add(lblHeader);
            pnlHeader.Controls.Add(lblSubHeader);

            // Status Card
            pnlStatusBox = new Panel();
            pnlStatusBox.Location = new Point(20, 85);
            pnlStatusBox.Size = new Size(365, 80);
            pnlStatusBox.BorderStyle = BorderStyle.FixedSingle;

            lblStatus = new Label();
            lblStatus.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblStatus.Location = new Point(12, 12);
            lblStatus.Size = new Size(340, 24);

            lblDetails = new Label();
            lblDetails.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblDetails.ForeColor = Color.FromArgb(71, 85, 105);
            lblDetails.Location = new Point(13, 38);
            lblDetails.Size = new Size(340, 32);

            pnlStatusBox.Controls.Add(lblStatus);
            pnlStatusBox.Controls.Add(lblDetails);

            // Toggle Button
            btnToggle = new Button();
            btnToggle.Location = new Point(20, 180);
            btnToggle.Size = new Size(200, 42);
            btnToggle.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnToggle.FlatStyle = FlatStyle.Flat;
            btnToggle.FlatAppearance.BorderSize = 0;
            btnToggle.Cursor = Cursors.Hand;
            btnToggle.Click += BtnToggle_Click;

            // Open Web POS Button
            btnOpenWeb = new Button();
            btnOpenWeb.Text = "Open Web POS";
            btnOpenWeb.Location = new Point(230, 180);
            btnOpenWeb.Size = new Size(155, 42);
            btnOpenWeb.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnOpenWeb.BackColor = Color.FromArgb(241, 245, 249);
            btnOpenWeb.ForeColor = Color.FromArgb(15, 23, 42);
            btnOpenWeb.FlatStyle = FlatStyle.Flat;
            btnOpenWeb.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnOpenWeb.Cursor = Cursors.Hand;
            btnOpenWeb.Click += (s, e) => {
                try { Process.Start("https://posdemo.bdhostt.com"); } catch {}
            };

            this.Controls.Add(btnOpenWeb);
            this.Controls.Add(btnToggle);
            this.Controls.Add(pnlStatusBox);
            this.Controls.Add(pnlHeader);

            // Auto-refresh timer every 2 seconds
            refreshTimer = new Timer();
            refreshTimer.Interval = 2000;
            refreshTimer.Tick += (s, e) => UpdateUIState();
            refreshTimer.Start();
        }

        private void UpdateUIState()
        {
            bool running = Program.IsServiceRunning();
            if (running)
            {
                pnlStatusBox.BackColor = Color.FromArgb(236, 253, 245); // emerald-50
                lblStatus.Text = "● Active & Ready (Port 9123)";
                lblStatus.ForeColor = Color.FromArgb(5, 150, 105); // emerald-600
                lblDetails.Text = "Thermal Printer service is running smoothly in the background. Instant 0ms hardware printing active.";

                btnToggle.Text = "⏹ Stop Service";
                btnToggle.BackColor = Color.FromArgb(225, 29, 72); // rose-600
                btnToggle.ForeColor = Color.White;
            }
            else
            {
                pnlStatusBox.BackColor = Color.FromArgb(254, 242, 242); // rose-50
                lblStatus.Text = "● Service Stopped (Offline)";
                lblStatus.ForeColor = Color.FromArgb(225, 29, 72); // rose-600
                lblDetails.Text = "Printer Bridge is not running. Click 'Start Service' to enable direct printing from the Web POS.";

                btnToggle.Text = "▶ Start Service";
                btnToggle.BackColor = Color.FromArgb(5, 150, 105); // emerald-600
                btnToggle.ForeColor = Color.White;
            }
        }

        private void BtnToggle_Click(object sender, EventArgs e)
        {
            btnToggle.Enabled = false;
            if (Program.IsServiceRunning())
            {
                btnToggle.Text = "Stopping...";
                Program.StopService();
            }
            else
            {
                btnToggle.Text = "Starting...";
                Program.StartService();
            }

            System.Threading.Thread.Sleep(1000);
            UpdateUIState();
            btnToggle.Enabled = true;
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            refreshTimer.Stop();
            base.OnFormClosing(e);
        }
    }
}

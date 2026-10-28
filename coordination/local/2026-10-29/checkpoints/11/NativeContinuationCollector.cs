// MU20-11-M1 candidate. A library only: no Main, launch, attach, input or process mutation.
// Compile-only in the owner task. Native use requires primary review and calibration.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using Microsoft.Win32.SafeHandles;

[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]

namespace GlossQuote.MU20
{
    public sealed class CollectorFailure : Exception
    {
        public readonly string Code;
        public readonly int NativeError;
        internal CollectorFailure(string code, int error) : base(code) { Code = code; NativeError = error; }
    }

    internal sealed class OwnedHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        internal bool releaseSucceeded;
        internal OwnedHandle(IntPtr value) : base(true) { SetHandle(value); }
        protected override bool ReleaseHandle() { releaseSucceeded = Native.CloseHandle(handle); return releaseSucceeded; }
    }

    internal static class Native
    {
        internal const uint ProcessQueryAccess = 0x00101400; // SYNCHRONIZE | QUERY_INFORMATION | QUERY_LIMITED_INFORMATION
        internal const uint ThreadQueryAccess = 0x00100800;  // SYNCHRONIZE | QUERY_LIMITED_INFORMATION
        internal const int MaxProcesses = 128, MaxThreads = 512, MaxRawBytes = 1048576;
        // Official SDK header pin/ABI derivation: sources/sdk-reference.json and ABI.md.
        internal const uint CaptureThreads = 0x80, ThreadTerminated = 1, ErrorNoMoreItems = 259;
        internal const int WalkThreads = 3;
        [StructLayout(LayoutKind.Sequential, Pack = 4)] internal struct Ft { public uint low, high; public ulong Value { get { return ((ulong)high << 32) | low; } } }
        [StructLayout(LayoutKind.Sequential, Pack = 8)] internal struct ThreadEntry
        {
            public uint exitStatus; public IntPtr teb; public uint processId, threadId;
            public UIntPtr affinity; public int priority, basePriority; public IntPtr lastArgument;
            public ushort lastSyscall; public Ft create, exit, kernel, user; public IntPtr startAddress;
            public Ft capture; public uint flags; public ushort suspendCount, contextSize; public IntPtr context;
        }
        // Managed metadata only. Must pass before the first P/Invoke; no guessed native trial.
        internal static void AssertAbi()
        {
            string[] names = { "exitStatus", "teb", "processId", "threadId", "affinity", "priority", "basePriority", "lastArgument", "lastSyscall", "create", "exit", "kernel", "user", "startAddress", "capture", "flags", "suspendCount", "contextSize", "context" };
            int[] offsets = { 0, 8, 16, 20, 24, 32, 36, 40, 48, 52, 60, 68, 76, 88, 96, 104, 108, 110, 112 };
            if (IntPtr.Size != 8 || Marshal.SizeOf(typeof(Ft)) != 8 || Marshal.SizeOf(typeof(ThreadEntry)) != 120)
                throw new CollectorFailure("PINNED_X64_PSS_ABI_MISMATCH", 0);
            for (int i = 0; i < names.Length; i++)
                if (Marshal.OffsetOf(typeof(ThreadEntry), names[i]).ToInt64() != offsets[i])
                    throw new CollectorFailure("PINNED_X64_PSS_FIELD_OFFSET_MISMATCH", 0);
        }
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool CloseHandle(IntPtr h);
        [DllImport("kernel32.dll")] internal static extern IntPtr GetCurrentProcess();
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool DuplicateHandle(IntPtr sourceProcess, IntPtr source, IntPtr targetProcess, out IntPtr target, uint access, [MarshalAs(UnmanagedType.Bool)] bool inherit, uint options);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool QueryInformationJobObject(OwnedHandle job, int infoClass, IntPtr buffer, uint size, out uint returned);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern IntPtr OpenProcess(uint access, [MarshalAs(UnmanagedType.Bool)] bool inherit, uint pid);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool IsProcessInJob(OwnedHandle process, OwnedHandle job, [MarshalAs(UnmanagedType.Bool)] out bool inside);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern uint GetProcessId(OwnedHandle process);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool GetProcessTimes(OwnedHandle process, out Ft create, out Ft exit, out Ft kernel, out Ft user);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern uint WaitForSingleObject(OwnedHandle handle, uint timeout);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool QueryFullProcessImageName(OwnedHandle process, uint flags, StringBuilder path, ref uint size);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool GetProcessMitigationPolicy(OwnedHandle process, int policy, out uint flags, UIntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool QueryPerformanceCounter(out long qpc);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool QueryPerformanceFrequency(out long frequency);
        [DllImport("kernelbase.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool CompareObjectHandles(IntPtr first, IntPtr second);
        [DllImport("user32.dll", SetLastError = true)] internal static extern IntPtr GetThreadDesktop(uint tid);
        [DllImport("kernel32.dll")] internal static extern uint PssCaptureSnapshot(OwnedHandle process, uint flags, uint contextFlags, out IntPtr snapshot);
        [DllImport("kernel32.dll")] internal static extern uint PssWalkMarkerCreate(IntPtr allocator, out IntPtr marker);
        [DllImport("kernel32.dll")] internal static extern uint PssWalkSnapshot(IntPtr snapshot, int infoClass, IntPtr marker, out ThreadEntry entry, uint size);
        [DllImport("kernel32.dll")] internal static extern uint PssWalkMarkerFree(IntPtr marker);
        [DllImport("kernel32.dll")] internal static extern uint PssFreeSnapshot(IntPtr owner, IntPtr snapshot);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern IntPtr OpenThread(uint access, [MarshalAs(UnmanagedType.Bool)] bool inherit, uint tid);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern uint GetProcessIdOfThread(OwnedHandle thread);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool GetThreadTimes(OwnedHandle thread, out Ft create, out Ft exit, out Ft kernel, out Ft user);
        internal static void Require(bool condition, string code) { if (!condition) throw new CollectorFailure(code, Marshal.GetLastWin32Error()); }
        internal static string Tick() { long v; Require(QueryPerformanceCounter(out v) && v >= 0, "QPC_FAILED"); return v.ToString(CultureInfo.InvariantCulture); }
        internal static string U64(ulong v) { return v.ToString(CultureInfo.InvariantCulture); }
    }

    // DTOs intentionally contain metadata only. Reserved PSS pointers/context are never exported or read.
    internal sealed class ThreadProof { public uint tid; public string creationFileTime; public bool sameDesktopObject; }
    internal sealed class Query
    {
        public uint pid; public string queryStartQpc, qpc, creationFileTime, exitFileTime, jobId, imagePath, desktopId;
        public bool running, inExpectedJob, desktopObjectVerified, win32kDisabled;
        public bool mitigationQuerySucceeded; public uint mitigationFlags; public int mitigationError;
        public List<ThreadProof> threads = new List<ThreadProof>();
    }
    internal sealed class Held
    {
        internal OwnedHandle handle;
        public uint pid; public string handleToken, openedQpc; public string closedQpc = null;
        public bool sameHandle = true;
        public Query before, after;
    }
    internal sealed class Failure { public string code; public int win32; }
    internal sealed class Receipt
    {
        public int schemaVersion = 2;
        public string kind = "MU20_NATIVE_CONTINUOUS_HANDLE_CANDIDATE";
        public string captureId, status = "PREPARING", qpcFrequency, startQpc, endQpc, rawCdpJson;
        public bool executionAuthorized = false, handlesHeldAtSave;
        public object expected;
        public List<uint> initialJobPids;
        public List<Held> retained = new List<Held>();
        public List<Failure> errors = new List<Failure>();
    }

    public sealed class NativeContinuationCollector : IDisposable
    {
        private readonly object sync = new object();
        private readonly OwnedHandle job;
        private readonly IntPtr borrowedDesktop;
        private readonly uint browserPid;
        private readonly string creation, jobId, desktopId, image;
        private readonly bool nodeCalibrationOnly;
        private readonly Receipt receipt;
        private bool disposed, saved;
        private string cleanupJson;
        private static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);

        // The primary must KEEP its original job and desktop handles alive until Dispose completes.
        // No OpenJobObject/OpenDesktop by name and no caller-supplied PID list is accepted.
        public NativeContinuationCollector(IntPtr primaryOwnedJob, IntPtr primaryOwnedDesktop,
            uint expectedBrowserPid, string expectedBrowserCreationFileTime,
            string expectedJobLabel, string expectedDesktopLabel, string expectedImagePath)
            : this(primaryOwnedJob, primaryOwnedDesktop, expectedBrowserPid, expectedBrowserCreationFileTime, expectedJobLabel, expectedDesktopLabel, expectedImagePath, false) { }

        // A distinct protocol: no fake browser roles/processInfo and never accepted by the browser adapter.
        public static NativeContinuationCollector ForNodeCalibration(IntPtr primaryOwnedJob, IntPtr primaryOwnedDesktop,
            uint rootPid, string originalRootCreationFileTime, string jobLabel, string desktopLabel, string nodeImagePath)
        { return new NativeContinuationCollector(primaryOwnedJob, primaryOwnedDesktop, rootPid, originalRootCreationFileTime, jobLabel, desktopLabel, nodeImagePath, true); }

        private NativeContinuationCollector(IntPtr primaryOwnedJob, IntPtr primaryOwnedDesktop,
            uint expectedBrowserPid, string expectedBrowserCreationFileTime,
            string expectedJobLabel, string expectedDesktopLabel, string expectedImagePath, bool calibrationOnly)
        {
            if (IntPtr.Size != 8 || primaryOwnedJob == IntPtr.Zero || primaryOwnedJob == new IntPtr(-1) ||
                primaryOwnedDesktop == IntPtr.Zero || primaryOwnedDesktop == new IntPtr(-1) || expectedBrowserPid == 0)
                throw new CollectorFailure("NATIVE_BOUNDARY_HANDLES_REQUIRED_X64", 0);
            Native.AssertAbi();
            ulong c;
            if (!UInt64.TryParse(expectedBrowserCreationFileTime, NumberStyles.None, CultureInfo.InvariantCulture, out c) || c == 0 ||
                String.IsNullOrEmpty(expectedJobLabel) || expectedJobLabel.Length > 128 ||
                String.IsNullOrEmpty(expectedDesktopLabel) || expectedDesktopLabel.Length > 128 ||
                String.IsNullOrEmpty(expectedImagePath) || expectedImagePath.Length > 1024 ||
                expectedImagePath.Length < 4 || expectedImagePath[1] != ':' || !Path.IsPathRooted(expectedImagePath))
                throw new CollectorFailure("EXPECTED_BOUNDARY_METADATA_REQUIRED", 0);
            browserPid = expectedBrowserPid; creation = Native.U64(c); jobId = expectedJobLabel; desktopId = expectedDesktopLabel;
            image = Path.GetFullPath(expectedImagePath); borrowedDesktop = primaryOwnedDesktop;
            nodeCalibrationOnly = calibrationOnly;
            receipt = new Receipt(); receipt.captureId = Guid.NewGuid().ToString("N");
            if (calibrationOnly) receipt.kind = "MU20_NATIVE_NODE_PRIMITIVES_CALIBRATION";
            receipt.expected = new { browserPid = browserPid, browserCreationFileTime = creation, jobId = jobId, desktopId = desktopId, imagePath = image };
            IntPtr duplicate;
            Native.Require(Native.DuplicateHandle(Native.GetCurrentProcess(), primaryOwnedJob, Native.GetCurrentProcess(), out duplicate, 4, false, 0), "JOB_QUERY_HANDLE_DUPLICATION_FAILED");
            job = new OwnedHandle(duplicate);
            try
            {
                Native.Require(Native.CompareObjectHandles(primaryOwnedJob, duplicate), "JOB_OBJECT_IDENTITY_FAILED");
                long frequency; Native.Require(Native.QueryPerformanceFrequency(out frequency) && frequency > 0, "QPC_FREQUENCY_FAILED");
                receipt.qpcFrequency = frequency.ToString(CultureInfo.InvariantCulture);
                Prepare();
            }
            catch (Exception ex) { Fail(ex); }
        }

        private List<uint> JobPids()
        {
            int size = checked(8 + Native.MaxProcesses * IntPtr.Size);
            IntPtr buffer = Marshal.AllocHGlobal(size);
            try
            {
                // Fixed cap: incomplete lists fail; no blind retry or global enumeration.
                uint returned;
                Native.Require(Native.QueryInformationJobObject(job, 3, buffer, (uint)size, out returned), "JOB_PID_QUERY_FAILED_OR_TRUNCATED");
                uint assigned = unchecked((uint)Marshal.ReadInt32(buffer, 0));
                uint count = unchecked((uint)Marshal.ReadInt32(buffer, 4));
                if (count == 0 || count != assigned || count > Native.MaxProcesses)
                    throw new CollectorFailure("JOB_PID_LIST_INCOMPLETE_OR_OVER_CAP", 0);
                List<uint> ids = new List<uint>(); HashSet<uint> seen = new HashSet<uint>();
                for (int i = 0; i < (int)count; i++)
                {
                    ulong value = unchecked((ulong)Marshal.ReadInt64(buffer, 8 + i * 8));
                    if (value == 0 || value > UInt32.MaxValue || !seen.Add((uint)value))
                        throw new CollectorFailure("JOB_PID_LIST_INVALID", 0);
                    ids.Add((uint)value);
                }
                return ids;
            }
            finally { Marshal.FreeHGlobal(buffer); }
        }

        private void Prepare()
        {
            receipt.initialJobPids = JobPids();
            if (!receipt.initialJobPids.Contains(browserPid)) throw new CollectorFailure("BROWSER_NOT_IN_OWNED_JOB", 0);
            foreach (uint pid in receipt.initialJobPids)
            {
                OwnedHandle process = new OwnedHandle(Native.OpenProcess(Native.ProcessQueryAccess, false, pid));
                if (process.IsInvalid) { process.Dispose(); throw new CollectorFailure("OWNED_JOB_PID_OPEN_FAILED", Marshal.GetLastWin32Error()); }
                Held held = new Held(); held.pid = pid; held.handle = process; held.handleToken = Guid.NewGuid().ToString("N");
                receipt.retained.Add(held); held.openedQpc = Native.Tick();
                // Before times/image/thread queries: disallow a PID that changed out of the job.
                bool inside;
                Native.Require(Native.IsProcessInJob(process, job, out inside), "OPENED_PID_JOB_QUERY_FAILED");
                if (!inside) throw new CollectorFailure("OPENED_PID_NO_LONGER_IN_JOB", 0);
                held.before = QueryHeld(held);
                if (pid == browserPid && (held.before.creationFileTime != creation || !SameImage(held.before.imagePath)))
                    throw new CollectorFailure("BROWSER_LAUNCH_GENERATION_OR_IMAGE_MISMATCH", 0);
            }
            receipt.status = "PREPARED";
        }

        private bool SameImage(string value) { return String.Equals(value, image, StringComparison.OrdinalIgnoreCase); }

        private Query QueryHeld(Held held)
        {
            if (held.handle.IsClosed || held.handle.IsInvalid) throw new CollectorFailure("RETAINED_HANDLE_UNAVAILABLE", 0);
            Query q = new Query(); q.queryStartQpc = Native.Tick(); q.pid = Native.GetProcessId(held.handle);
            if (q.pid != held.pid) throw new CollectorFailure("HELD_PROCESS_ID_MISMATCH", 0);
            bool inside; Native.Require(Native.IsProcessInJob(held.handle, job, out inside), "HELD_JOB_QUERY_FAILED");
            q.inExpectedJob = inside; q.jobId = jobId;
            if (!inside) throw new CollectorFailure("HELD_PROCESS_OUTSIDE_JOB", 0);
            Native.Ft born, exited, kernel, user;
            Native.Require(Native.GetProcessTimes(held.handle, out born, out exited, out kernel, out user), "PROCESS_TIMES_FAILED");
            q.creationFileTime = Native.U64(born.Value); q.exitFileTime = Native.U64(exited.Value);
            if (born.Value == 0) throw new CollectorFailure("PROCESS_CREATION_TIME_ZERO", 0);
            uint wait = Native.WaitForSingleObject(held.handle, 0);
            if (wait != 0 && wait != 258) throw new CollectorFailure("PROCESS_LIVENESS_QUERY_FAILED", Marshal.GetLastWin32Error());
            q.running = wait == 258;
            StringBuilder path = new StringBuilder(32768); uint length = 32768;
            Native.Require(Native.QueryFullProcessImageName(held.handle, 0, path, ref length), "PROCESS_IMAGE_QUERY_FAILED");
            q.imagePath = path.ToString(); q.desktopId = desktopId;
            // Non-browser job members retain basic metadata only. If CDP reports one, pure validation rejects its image.
            if (SameImage(q.imagePath))
            {
                uint flags;
                q.mitigationQuerySucceeded = Native.GetProcessMitigationPolicy(held.handle, 4, out flags, new UIntPtr(4));
                q.mitigationFlags = q.mitigationQuerySucceeded ? flags : 0;
                q.mitigationError = q.mitigationQuerySucceeded ? 0 : Marshal.GetLastWin32Error();
                q.win32kDisabled = q.mitigationQuerySucceeded && (flags & 1) != 0; // audit bit2 alone is insufficient
                if (held.pid == browserPid || !q.win32kDisabled)
                {
                    q.threads = DesktopProof(held);
                    q.desktopObjectVerified = q.threads.Count > 0;
                }
            }
            q.qpc = Native.Tick();
            return q;
        }

        private List<ThreadProof> DesktopProof(Held held)
        {
            IntPtr snapshot = IntPtr.Zero, marker = IntPtr.Zero;
            List<ThreadProof> proofs = new List<ThreadProof>();
            uint cleanupError = 0;
            try
            {
                // IDs/times only; no VA clone, memory, handle table, stack or thread context.
                uint result = Native.PssCaptureSnapshot(held.handle, Native.CaptureThreads, 0, out snapshot);
                if (result != 0) throw new CollectorFailure("OWNED_THREAD_SNAPSHOT_FAILED_NO_RIGHTS_ESCALATION", (int)result);
                result = Native.PssWalkMarkerCreate(IntPtr.Zero, out marker);
                if (result != 0) throw new CollectorFailure("THREAD_WALK_MARKER_FAILED", (int)result);
                HashSet<uint> ids = new HashSet<uint>(); int entries = 0;
                while (true)
                {
                    Native.ThreadEntry entry;
                    result = Native.PssWalkSnapshot(snapshot, Native.WalkThreads, marker, out entry, (uint)Marshal.SizeOf(typeof(Native.ThreadEntry)));
                    if (result == Native.ErrorNoMoreItems) break; // not a process exit-code guess
                    if (result != 0) throw new CollectorFailure("THREAD_WALK_FAILED", (int)result);
                    if (++entries > Native.MaxThreads || entry.processId != held.pid || entry.threadId == 0 || !ids.Add(entry.threadId))
                        throw new CollectorFailure("OWNED_THREAD_SNAPSHOT_INVALID_OR_OVER_CAP", 0);
                    if ((entry.flags & Native.ThreadTerminated) != 0) throw new CollectorFailure("THREAD_EXITED_DURING_SNAPSHOT_REQUIRE_REJECT", 0);
                    using (OwnedHandle thread = new OwnedHandle(Native.OpenThread(Native.ThreadQueryAccess, false, entry.threadId)))
                    {
                        Native.Require(!thread.IsInvalid, "OWNED_SNAPSHOT_THREAD_OPEN_FAILED");
                        // TID reuse: verify process and generation before any desktop query.
                        if (Native.GetProcessIdOfThread(thread) != held.pid) throw new CollectorFailure("SNAPSHOT_THREAD_OWNER_CHANGED", 0);
                        Native.Ft born, exited, kernel, user;
                        Native.Require(Native.GetThreadTimes(thread, out born, out exited, out kernel, out user), "OWNED_THREAD_TIMES_FAILED");
                        if (born.Value == 0 || born.Value != entry.create.Value || Native.WaitForSingleObject(thread, 0) != 258)
                            throw new CollectorFailure("SNAPSHOT_THREAD_GENERATION_OR_LIVENESS_CHANGED", 0);
                        IntPtr desktop = Native.GetThreadDesktop(entry.threadId);
                        Native.Require(desktop != IntPtr.Zero && Native.CompareObjectHandles(desktop, borrowedDesktop), "DESKTOP_KERNEL_OBJECT_NOT_VERIFIED");
                        // GetThreadDesktop return is borrowed: never CloseHandle/CloseDesktop it.
                        proofs.Add(new ThreadProof { tid = entry.threadId, creationFileTime = Native.U64(born.Value), sameDesktopObject = true });
                    }
                }
                if (proofs.Count == 0) throw new CollectorFailure("OWNED_LIVE_THREAD_LIST_EMPTY", 0);
            }
            finally
            {
                if (marker != IntPtr.Zero) cleanupError = Native.PssWalkMarkerFree(marker);
                if (snapshot != IntPtr.Zero)
                {
                    uint freed = Native.PssFreeSnapshot(Native.GetCurrentProcess(), snapshot);
                    if (freed != 0) cleanupError = freed;
                }
            }
            if (cleanupError != 0) throw new CollectorFailure("LOCAL_THREAD_SNAPSHOT_RELEASE_FAILED", (int)cleanupError);
            return proofs;
        }

        // Caller must start its browser-target CDP request only AFTER this returns.
        public string StartCdp()
        {
            lock (sync)
            {
                RequireState("PREPARED");
                if (nodeCalibrationOnly) throw new CollectorFailure("NODE_CALIBRATION_IS_NOT_BROWSER_CDP", 0);
                receipt.startQpc = Native.Tick(); receipt.status = "CDP_PENDING";
                return receipt.captureId;
            }
        }

        // Raw result object from the same authenticated browser CDP target, not a CSV reconstruction.
        public void FinishCdp(string captureToken, string rawCdpResultJson)
        {
            lock (sync)
            {
                RequireState("CDP_PENDING");
                try
                {
                    receipt.endQpc = Native.Tick();
                    if (captureToken != receipt.captureId || rawCdpResultJson == null || Utf8.GetByteCount(rawCdpResultJson) > Native.MaxRawBytes)
                        throw new CollectorFailure("RAW_CDP_CAPTURE_TOKEN_OR_SIZE_INVALID", 0);
                    receipt.rawCdpJson = rawCdpResultJson; // preserve before any validation/filtering
                    foreach (Held held in receipt.retained) held.after = QueryHeld(held); // SAME private SafeHandle; no OpenProcess
                    receipt.status = "COMPLETE_DATA_ONLY";
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        public void RecordCdpFailure()
        {
            lock (sync) { RequireState("CDP_PENDING"); receipt.endQpc = Native.Tick(); Fail(new CollectorFailure("CDP_REQUEST_FAILED", 0)); }
        }

        public string StartCalibration()
        {
            lock (sync)
            {
                RequireState("PREPARED");
                if (!nodeCalibrationOnly) throw new CollectorFailure("BROWSER_COLLECTOR_IS_NOT_NODE_CALIBRATION", 0);
                receipt.startQpc = Native.Tick(); receipt.status = "NODE_CALIBRATION_PENDING";
                return receipt.captureId;
            }
        }

        public void FinishCalibration(string captureToken)
        {
            lock (sync)
            {
                RequireState("NODE_CALIBRATION_PENDING");
                try
                {
                    receipt.endQpc = Native.Tick();
                    if (captureToken != receipt.captureId) throw new CollectorFailure("NODE_CALIBRATION_TOKEN_INVALID", 0);
                    // No CDP string or fabricated browser processInfo exists in this protocol.
                    foreach (Held held in receipt.retained) held.after = QueryHeld(held);
                    receipt.status = "COMPLETE_DATA_ONLY";
                }
                catch (Exception ex) { Fail(ex); }
            }
        }

        private void RequireState(string wanted)
        {
            if (disposed || saved || receipt.status != wanted) throw new CollectorFailure("COLLECTOR_STATE_INVALID", 0);
        }
        private void Fail(Exception ex)
        {
            CollectorFailure native = ex as CollectorFailure;
            receipt.status = "REJECTED_NATIVE_CAPTURE";
            receipt.errors.Add(new Failure { code = native == null ? "NATIVE_API_OR_INTERNAL_FAILURE" : native.Code, win32 = native == null ? 0 : native.NativeError });
        }

        // Writes only a new fixed-name receipt inside a primary-reviewed existing output folder.
        // Retained handles remain held THROUGH flush; Dispose is a separate, mandatory step.
        public string SaveNewReceipt(string primaryReviewedOutputDirectory)
        {
            lock (sync)
            {
                if (disposed || saved || (receipt.status != "COMPLETE_DATA_ONLY" && receipt.status != "REJECTED_NATIVE_CAPTURE"))
                    throw new CollectorFailure("RECEIPT_STATE_INVALID", 0);
                string directory = Path.GetFullPath(primaryReviewedOutputDirectory);
                if (!Directory.Exists(directory) || (File.GetAttributes(directory) & FileAttributes.ReparsePoint) != 0)
                    throw new CollectorFailure("REVIEWED_OUTPUT_DIRECTORY_REQUIRED", 0);
                foreach (Held held in receipt.retained)
                    if (held.handle.IsClosed || held.handle.IsInvalid) throw new CollectorFailure("HANDLE_CLOSED_BEFORE_RECEIPT", 0);
                receipt.handlesHeldAtSave = true;
                JavaScriptSerializer serializer = new JavaScriptSerializer(); serializer.MaxJsonLength = 16777216;
                byte[] bytes = Utf8.GetBytes(serializer.Serialize(receipt) + "\n");
                if (bytes.Length > 16777216) throw new CollectorFailure("RECEIPT_TOO_LARGE", 0);
                string output = Path.Combine(directory, "native-receipt.json");
                using (FileStream file = new FileStream(output, FileMode.CreateNew, FileAccess.Write, FileShare.Read))
                { file.Write(bytes, 0, bytes.Length); file.Flush(true); }
                saved = true;
                using (SHA256 hash = SHA256.Create()) { return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant(); }
            }
        }

        public void Dispose()
        {
            lock (sync)
            {
                if (disposed) return;
                int closed = 0; bool releasesSucceeded = true;
                // A clock/serialization failure must never interrupt handle release.
                foreach (Held held in receipt.retained)
                {
                    held.handle.Dispose(); closed++;
                    releasesSucceeded = releasesSucceeded && held.handle.releaseSucceeded;
                }
                job.Dispose(); // primary MUST still own its original job handle; no target-process mutation rights exist here
                releasesSucceeded = releasesSucceeded && job.releaseSucceeded;
                disposed = true;
                string closedAt = null;
                try { closedAt = Native.Tick(); } catch (CollectorFailure) { releasesSucceeded = false; }
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                cleanupJson = serializer.Serialize(new { captureId = receipt.captureId, savedBeforeClose = saved, processHandleCloseAttempts = closed, releasesSucceeded = releasesSucceeded, queryJobHandleCloseAttempted = true, borrowedDesktopClosed = false, executionAuthorized = false, closedQpc = closedAt });
            }
        }

        public string GetCleanupJson()
        {
            lock (sync) { if (!disposed) throw new CollectorFailure("CLEANUP_NOT_FINISHED", 0); return cleanupJson; }
        }
    }
}

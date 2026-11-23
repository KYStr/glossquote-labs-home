using System;
using System.Text;
using System.Runtime.InteropServices;
[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
namespace GlossQuote.New22 {
 internal static class Api {
  internal const uint WaitTimeout=258, NoMoreItems=259;
  [StructLayout(LayoutKind.Sequential,Pack=4)] internal struct Ft { public uint low,high; public ulong Value {get{return ((ulong)high<<32)|low;}} }
  [StructLayout(LayoutKind.Sequential,Pack=8)] internal struct PssThread {
   public uint exitStatus;public IntPtr teb;public uint pid,tid;public UIntPtr affinity;public int priority,basePriority;
   public IntPtr lastArgument;public ushort syscall;public Ft create,exit,kernel,user;public IntPtr start;
   public Ft capture;public uint flags;public ushort suspend,contextSize;public IntPtr context;
  }
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] internal struct Startup {
   public int cb;public string reserved,desktop,title;public uint x,y,xSize,ySize,xChars,yChars,fill,flags;
   public short show,reservedSize;public IntPtr reserved2,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] internal struct ProcessInfo {public IntPtr process,thread;public uint pid,tid;}
  [StructLayout(LayoutKind.Sequential)] internal struct JobBasic {public long processTime,jobTime;public uint flags;public UIntPtr min,max;public uint active;public UIntPtr affinity;public uint priority,scheduling;}
  [StructLayout(LayoutKind.Sequential)] internal struct Io {public ulong a,b,c,d,e,f;}
  [StructLayout(LayoutKind.Sequential)] internal struct JobLimits {public JobBasic basic;public Io io;public UIntPtr processMemory,jobMemory,peakProcess,peakJob;}
  [StructLayout(LayoutKind.Sequential)] internal struct Accounting {public long user,kernel,periodUser,periodKernel;public uint faults,totalProcesses,activeProcesses,terminated;}
  [StructLayout(LayoutKind.Sequential)] internal struct UserFlags {public int inherit,reserved;public uint flags;}
  [DllImport("user32.dll")] internal static extern IntPtr GetProcessWindowStation();
  [DllImport("user32.dll",SetLastError=true)] internal static extern IntPtr GetThreadDesktop(uint tid);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern bool GetUserObjectInformationW(IntPtr h,int index,IntPtr buffer,uint size,out uint needed);
  [DllImport("kernelbase.dll")] internal static extern bool CompareObjectHandles(IntPtr first,IntPtr second);
  [DllImport("kernel32.dll")] internal static extern uint GetCurrentThreadId();
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool QueryPerformanceCounter(out long value);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool QueryPerformanceFrequency(out long value);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern IntPtr CreateJobObjectW(IntPtr attributes,IntPtr name);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool SetInformationJobObject(IntPtr job,int kind,IntPtr value,uint bytes);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool QueryInformationJobObject(IntPtr job,int kind,IntPtr value,uint bytes,out uint returned);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool inside);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern bool CreateProcessW(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr environment,string cwd,ref Startup startup,out ProcessInfo pi);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetProcessTimes(IntPtr h,out Ft born,out Ft exited,out Ft kernel,out Ft user);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetThreadTimes(IntPtr h,out Ft born,out Ft exited,out Ft kernel,out Ft user);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint GetProcessId(IntPtr process);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint GetProcessIdOfThread(IntPtr thread);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern IntPtr OpenThread(uint access,bool inherit,uint tid);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern bool QueryFullProcessImageNameW(IntPtr process,uint flags,StringBuilder name,ref uint size);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetProcessMitigationPolicy(IntPtr process,int kind,out uint flags,UIntPtr bytes);
  [DllImport("kernel32.dll")] internal static extern IntPtr GetCurrentProcess();
  [DllImport("kernel32.dll")] internal static extern uint PssCaptureSnapshot(IntPtr process,uint flags,uint contextFlags,out IntPtr snapshot);
  [DllImport("kernel32.dll")] internal static extern uint PssWalkMarkerCreate(IntPtr allocator,out IntPtr marker);
  [DllImport("kernel32.dll")] internal static extern uint PssWalkSnapshot(IntPtr snapshot,int kind,IntPtr marker,out PssThread thread,uint bytes);
  [DllImport("kernel32.dll")] internal static extern uint PssWalkMarkerFree(IntPtr marker);
  [DllImport("kernel32.dll")] internal static extern uint PssFreeSnapshot(IntPtr owner,IntPtr snapshot);
  internal static void AssertLayout(){
   string[] fields={"exitStatus","teb","pid","tid","affinity","priority","basePriority","lastArgument","syscall","create","exit","kernel","user","start","capture","flags","suspend","contextSize","context"};
   int[] offsets={0,8,16,20,24,32,36,40,48,52,60,68,76,88,96,104,108,110,112};
   if(IntPtr.Size!=8||Marshal.SizeOf(typeof(Ft))!=8||Marshal.SizeOf(typeof(PssThread))!=120)throw new Stop("PINNED_X64_ABI_MISMATCH",0);
   for(int i=0;i<fields.Length;i++)if(Marshal.OffsetOf(typeof(PssThread),fields[i]).ToInt64()!=offsets[i])throw new Stop("PINNED_X64_FIELD_OFFSET_MISMATCH",0);
  }
  internal static void Need(bool ok,string code){if(!ok)throw new Stop(code,Marshal.GetLastWin32Error());}
  internal static string Tick(){long value;Need(QueryPerformanceCounter(out value)&&value>=0,"QPC_FAILED");return value.ToString(System.Globalization.CultureInfo.InvariantCulture);}
 }
 internal sealed class Stop:Exception {internal readonly string Code;internal readonly int Error;internal Stop(string code,int error):base(code){Code=code;Error=error;}}
}

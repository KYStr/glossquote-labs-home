using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Globalization;
using System.Web.Script.Serialization;

namespace GlossQuote.New22 {
 // A host adapter, NOT a runnable Main. Primary must retain this object and its
 // borrowed boundary lease until TryRelease reports released=true. Never auto-exit
 // the hosting process while native leases are pending.
 public sealed class PrimaryBoundaryLease {
  public readonly IntPtr Station,Desktop;
  public readonly string StationName,DesktopName;
  public PrimaryBoundaryLease(IntPtr station,IntPtr desktop,string stationName,string desktopName){Station=station;Desktop=desktop;StationName=stationName;DesktopName=desktopName;}
 }
 public sealed class NodeIsolationSession {
  const string NodeExe="C:\\Program Files\\nodejs\\node.exe";
  static readonly object SingleSessionGate=new object();static NodeIsolationSession activeSession;
  readonly PrimaryBoundaryLease boundary;
  readonly string directory,owner,captureId=Guid.NewGuid().ToString("N");
  readonly JavaScriptSerializer json=new JavaScriptSerializer{MaxJsonLength=16777216};
  readonly List<object> trace=new List<object>(),errors=new List<object>();
  readonly Dictionary<string,object> receipt;
  Api.ProcessInfo original;IntPtr jobA=IntPtr.Zero,jobB=IntPtr.Zero;
  string processBorn,threadBorn,processOpenedQpc;bool createdHere,resumed,saved,released,releaseFailed,releaseReceiptsWritten;
  Dictionary<string,object> retained,beforeJob,afterJob;
  int retireAttempt;
  static Dictionary<string,object> D(params object[] pairs){var d=new Dictionary<string,object>();for(int i=0;i<pairs.Length;i+=2)d.Add((string)pairs[i],pairs[i+1]);return d;}
  static string U(ulong v){return v.ToString(CultureInfo.InvariantCulture);}
  static bool Valid(IntPtr p){return p!=IntPtr.Zero&&p!=new IntPtr(-1);}
  static string Hash(string p){using(var h=SHA256.Create())using(var f=File.OpenRead(p))return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToLowerInvariant();}
  static string CleanPath(string p){var full=Path.GetFullPath(p);if(full.IndexOf('"')>=0||full.IndexOf('\0')>=0||full.IndexOf('\r')>=0||full.IndexOf('\n')>=0)throw new Stop("FIXED_PATH_INVALID",0);return full;}
  void Save(string name,object value){byte[] bytes=new UTF8Encoding(false,true).GetBytes(json.Serialize(value)+"\n");if(bytes.Length>16777216)throw new Stop("RECEIPT_OVER_CAP",0);using(var f=new FileStream(Path.Combine(directory,name),FileMode.CreateNew,FileAccess.Write,FileShare.Read)){f.Write(bytes,0,bytes.Length);f.Flush(true);}}
  NodeIsolationSession(PrimaryBoundaryLease lease){
   boundary=lease;
   var location=typeof(NodeIsolationSession).Assembly.Location;
   if(String.IsNullOrEmpty(location))throw new Stop("PHYSICAL_REVIEWED_ASSEMBLY_REQUIRED",0);
   owner=Path.GetDirectoryName(Path.GetDirectoryName(CleanPath(location)));
   if(Path.GetFileName(Path.GetDirectoryName(location))!="bin")throw new Stop("REVIEWED_BIN_LAYOUT_REQUIRED",0);
   string runtime=Path.Combine(owner,"runtime");Directory.CreateDirectory(runtime);
   if((File.GetAttributes(runtime)&FileAttributes.ReparsePoint)!=0)throw new Stop("RUNTIME_REPARSE_POINT_REJECTED",0);
   directory=Path.Combine(runtime,"node-"+captureId);Directory.CreateDirectory(directory);
   receipt=D("schemaVersion",2,"kind","MU20_NATIVE_NODE_PRIMITIVES_CALIBRATION","captureId",captureId,"status","PREPARING",
    "qpcFrequency",null,"startQpc",null,"endQpc",null,"rawCdpJson",null,"executionAuthorized",false,"handlesHeldAtSave",false,
    "expected",null,"initialJobPids",new uint[0],"retained",new List<object>(),"errors",errors);
  }
  public string OutputDirectory{get{return directory;}}
  // Host lifecycle guard: a thread-only lease, failed release, or missing release
  // receipts keeps the host alive even when other HANDLEs have already closed.
  public bool HasOutstandingNativeLeases{get{return releaseFailed||!released||!releaseReceiptsWritten||Valid(original.thread)||Valid(original.process)||Valid(jobA)||Valid(jobB);}}

  // Source/binary hashes are supplied from the primary-reviewed build inventory.
  // No environment/profile discovery, no shell and no arbitrary Node arguments.
  public static NodeIsolationSession Start(PrimaryBoundaryLease lease,string expectedNodeSha256,string expectedIdleScriptSha256){
   lock(SingleSessionGate){return StartSerial(lease,expectedNodeSha256,expectedIdleScriptSha256);}
  }
  static NodeIsolationSession StartSerial(PrimaryBoundaryLease lease,string expectedNodeSha256,string expectedIdleScriptSha256){
   if(activeSession!=null&&(!activeSession.released||!activeSession.releaseReceiptsWritten))throw new InvalidOperationException("PREVIOUS_SESSION_OR_RELEASE_EVIDENCE_PENDING_NO_NEW_NODE");
   if(lease==null||!Valid(lease.Station)||!Valid(lease.Desktop)||String.IsNullOrEmpty(lease.StationName)||String.IsNullOrEmpty(lease.DesktopName))throw new ArgumentException("PRIMARY_BOUNDARY_LEASE_REQUIRED");
   var s=new NodeIsolationSession(lease);activeSession=s;
   try{s.Run(expectedNodeSha256,expectedIdleScriptSha256);}
   catch(Exception e){var stop=e as Stop;s.receipt["status"]="REJECTED_NATIVE_CAPTURE";s.errors.Add(D("code",stop==null?"HOST_INTERNAL_FAILURE":stop.Code,"win32",stop==null?0:stop.Error));}
   finally{
    if(Valid(s.jobA))try{s.afterJob=s.SnapshotJob("after");s.RequireSingle(s.afterJob);}catch(Exception e){var stop=e as Stop;s.receipt["status"]="REJECTED_NATIVE_CAPTURE";s.errors.Add(D("code",stop==null?"AFTER_JOB_FAILED":stop.Code,"win32",stop==null?0:stop.Error));}
    try{s.receipt["handlesHeldAtSave"]=s.createdHere&&Valid(s.original.process);s.Save("native-receipt.json",s.receipt);s.Save("diagnostics.json",D("scope","NEW22_NATIVE_PRIMITIVES_ONLY_NOT_EDGE","beforeJob",s.beforeJob,"afterJob",s.afterJob,"apiTrace",s.trace,"createdHere",s.createdHere,"resumed",s.resumed,"originalThreadId",s.original.tid,"originalThreadCreationFileTime",s.threadBorn,"newNamedWindowStationCreated",false,"borrowedBoundaryClosed",false));s.saved=true;}
    catch(Exception){s.trace.Add(D("event","SAVE_FAILED","nativeAcceptance",false));}
   }
   return s; // Always hand outstanding handles back to the primary; no unsafe finally-close.
  }
  void Run(string nodeSha,string scriptSha){
   Api.AssertLayout();if(Marshal.SizeOf(typeof(Api.JobLimits))!=144||Marshal.SizeOf(typeof(Api.Accounting))!=48||Marshal.SizeOf(typeof(Api.Startup))!=104)throw new Stop("WIN64_HOST_ABI_MISMATCH",0);
   CheckBoundary();
   string script=CleanPath(Path.Combine(owner,"idle-node.mjs"));
   if(String.IsNullOrEmpty(nodeSha)||nodeSha.Length!=64||Hash(NodeExe)!=nodeSha||String.IsNullOrEmpty(scriptSha)||scriptSha.Length!=64||Hash(script)!=scriptSha)throw new Stop("FIXED_NODE_OR_SCRIPT_HASH_MISMATCH",0);
   long frequency;Api.Need(Api.QueryPerformanceFrequency(out frequency)&&frequency>0,"QPC_FREQUENCY_FAILED");receipt["qpcFrequency"]=frequency.ToString(CultureInfo.InvariantCulture);
   jobA=NewJob();jobB=NewJob();
   bool same=Api.CompareObjectHandles(jobA,jobA),different=Api.CompareObjectHandles(jobA,jobB);
   trace.Add(D("event","KERNEL_OBJECT_CONTROLS","sameObjectResult",same,"distinctJobsResult",different,"lastError",null));
   if(!same||different)throw new Stop("KERNEL_OBJECT_CONTROL_MISMATCH",0);
   string temp=Path.Combine(directory,"temp");Directory.CreateDirectory(temp);
   IntPtr env=Marshal.StringToHGlobalUni("PATH=C:\\Windows\\System32\0SystemRoot=C:\\Windows\0TEMP="+temp+"\0TMP="+temp+"\0WINDIR=C:\\Windows\0\0");
   var startup=new Api.Startup{cb=Marshal.SizeOf(typeof(Api.Startup)),desktop=boundary.StationName+"\\"+boundary.DesktopName,flags=1,show=0};
   try{
    // DETACHED_PROCESS, CREATE_SUSPENDED, CREATE_UNICODE_ENVIRONMENT, BELOW_NORMAL.
    // No CREATE_NO_WINDOW combination (documented ignored with DETACHED_PROCESS).
    Api.ProcessInfo pi;bool ok=Api.CreateProcessW(NodeExe,new StringBuilder("\""+NodeExe+"\" \""+script+"\""),IntPtr.Zero,IntPtr.Zero,false,0x440c,env,directory,ref startup,out pi);int createError=ok?0:Marshal.GetLastWin32Error();
    if(!ok)throw new Stop("OWN_NODE_CREATE_FAILED",createError); // Never adopt undefined out handles from a failed call.
    original=pi;createdHere=true;processOpenedQpc=Api.Tick(); // Original creation HANDLEs; no PID reopen.
   }finally{Marshal.FreeHGlobal(env);}
   Api.Ft born,exit,kernel,user;
   Api.Need(Api.GetProcessTimes(original.process,out born,out exit,out kernel,out user),"ORIGINAL_PROCESS_TIMES_FAILED");processBorn=U(born.Value);
   Api.Need(Api.GetThreadTimes(original.thread,out born,out exit,out kernel,out user),"ORIGINAL_THREAD_TIMES_FAILED");threadBorn=U(born.Value);
   if(processBorn=="0"||threadBorn=="0"||Api.GetProcessId(original.process)!=original.pid||Api.GetProcessIdOfThread(original.thread)!=original.pid)throw new Stop("ORIGINAL_CREATION_IDENTITY_FAILED",0);
   Api.Need(Api.AssignProcessToJobObject(jobA,original.process),"OWN_NODE_ASSIGN_BEFORE_RESUME_FAILED");
   bool positive=Membership(original.process,jobA),negative=Membership(original.process,jobB);
   trace.Add(D("event","ORIGINAL_CREATION","pid",original.pid,"tid",original.tid,"creationFileTime",processBorn,"threadCreationFileTime",threadBorn,"positiveInA",positive,"negativeInB",negative,"inheritedHandles",false,"creationFlags",0x440c));
   if(!positive||negative)throw new Stop("OWN_NODE_JOB_CONTROLS_FAILED",0);
   receipt["expected"]=D("browserPid",original.pid,"browserCreationFileTime",processBorn,"jobId","new22-job-A","desktopId",boundary.DesktopName,"imagePath",NodeExe);
   beforeJob=SnapshotJob("before-resume");RequireSingle(beforeJob);
   if(Api.ResumeThread(original.thread)!=1)throw new Stop("OWN_NODE_RESUME_NOT_SINGLE_SUSPENSION",Marshal.GetLastWin32Error());resumed=true;
   beforeJob=SnapshotJob("before");RequireSingle(beforeJob);
   receipt["initialJobPids"]=new uint[]{original.pid};
   retained=D("pid",original.pid,"handleToken",Guid.NewGuid().ToString("N"),"openedQpc",processOpenedQpc,"closedQpc",null,"sameHandle",true,"before",null,"after",null);
   receipt["retained"]=new object[]{retained};
   retained["before"]=QueryOriginal("before");
   receipt["startQpc"]=Api.Tick();receipt["endQpc"]=Api.Tick(); // Native primitive bracket, no fabricated CDP or IPC.
   retained["after"]=QueryOriginal("after");
   CheckBoundary();receipt["status"]="COMPLETE_DATA_ONLY";
  }
  string UserText(IntPtr h,int index){
   uint needed;bool first=Api.GetUserObjectInformationW(h,index,IntPtr.Zero,0,out needed);int error=first?0:Marshal.GetLastWin32Error();
   if((!first&&error!=122)||needed<2||needed>4096)throw new Stop("USER_OBJECT_SIZE_QUERY_FAILED",error);
   IntPtr b=Marshal.AllocHGlobal((int)needed);try{Api.Need(Api.GetUserObjectInformationW(h,index,b,needed,out needed),"USER_OBJECT_TEXT_QUERY_FAILED");return Marshal.PtrToStringUni(b);}finally{Marshal.FreeHGlobal(b);}
  }
  void CheckBoundary(){
   IntPtr current=Api.GetProcessWindowStation();
   if(!Valid(current)||!Api.CompareObjectHandles(current,boundary.Station)||UserText(boundary.Station,3)!="WindowStation"||UserText(boundary.Station,2)!=boundary.StationName||String.Equals(boundary.StationName,"WinSta0",StringComparison.OrdinalIgnoreCase))throw new Stop("PRIMARY_STATION_IDENTITY_NOT_PROVEN",0);
   IntPtr b=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(Api.UserFlags)));try{uint needed;Api.Need(Api.GetUserObjectInformationW(current,1,b,(uint)Marshal.SizeOf(typeof(Api.UserFlags)),out needed),"STATION_FLAGS_FAILED");if((((Api.UserFlags)Marshal.PtrToStructure(b,typeof(Api.UserFlags))).flags&1)!=0)throw new Stop("VISIBLE_STATION_REJECTED_BEFORE_NODE",0);}finally{Marshal.FreeHGlobal(b);}
   if(UserText(boundary.Desktop,3)!="Desktop"||UserText(boundary.Desktop,2)!=boundary.DesktopName)throw new Stop("PRIMARY_DESKTOP_TYPE_OR_DESCRIPTOR_FAILED",0);
   IntPtr own=Api.GetThreadDesktop(Api.GetCurrentThreadId());int err=own==IntPtr.Zero?Marshal.GetLastWin32Error():0;
   trace.Add(D("event","HOST_GET_THREAD_DESKTOP","returnedNonNull",own!=IntPtr.Zero,"lastError",own==IntPtr.Zero?(object)err:null));
   if(own==IntPtr.Zero)throw new Stop("HOST_GET_THREAD_DESKTOP_NULL",err);
   bool same=Api.CompareObjectHandles(own,boundary.Desktop);trace.Add(D("event","HOST_DESKTOP_COMPARE","completed",true,"result",same,"lastError",null));
   if(!same)throw new Stop("HOST_DESKTOP_NOT_SAME_OBJECT",0);
  }
  static IntPtr NewJob(){
   IntPtr job=Api.CreateJobObjectW(IntPtr.Zero,IntPtr.Zero);Api.Need(Valid(job),"OWN_JOB_CREATE_FAILED");
   var limits=new Api.JobLimits();limits.basic.flags=0x2000;int size=Marshal.SizeOf(typeof(Api.JobLimits));IntPtr b=Marshal.AllocHGlobal(size);
   try{Marshal.StructureToPtr(limits,b,false);Api.Need(Api.SetInformationJobObject(job,9,b,(uint)size),"OWN_JOB_KILL_ON_CLOSE_FAILED");return job;}
   catch{Api.CloseHandle(job);throw;}finally{Marshal.FreeHGlobal(b);}
  }
  bool Membership(IntPtr process,IntPtr job){bool inside;bool returned=Api.IsProcessInJob(process,job,out inside);int err=returned?0:Marshal.GetLastWin32Error();trace.Add(D("event","IS_PROCESS_IN_JOB","callReturnedSuccess",returned,"inside",returned?(object)inside:null,"lastError",returned?null:(object)err));if(!returned)throw new Stop("OWN_MEMBERSHIP_CALL_FAILED",err);return inside;}
  Dictionary<string,object> SnapshotJob(string phase){
   int size=8+128*8;IntPtr b=Marshal.AllocHGlobal(size);
   try{uint returned;Api.Need(Api.QueryInformationJobObject(jobA,3,b,(uint)size,out returned),"FULL_JOB_LIST_FAILED_OR_TRUNCATED");uint assigned=unchecked((uint)Marshal.ReadInt32(b,0)),count=unchecked((uint)Marshal.ReadInt32(b,4));if(count>128||count!=assigned)throw new Stop("FULL_JOB_LIST_COUNTS_INVALID",0);
    var ids=new List<uint>();var members=new List<object>();var seen=new HashSet<uint>();
    var snapshot=D("phase",phase,"complete",true,"assignedCount",assigned,"returnedCount",count,"listedPids",ids,"members",members,"qpc",Api.Tick());trace.Add(D("event","FULL_JOB_SNAPSHOT","snapshot",snapshot));
    for(int i=0;i<(int)count;i++){ulong id=unchecked((ulong)Marshal.ReadInt64(b,8+i*8));if(id==0||id>UInt32.MaxValue||!seen.Add((uint)id))throw new Stop("FULL_JOB_PID_LIST_INVALID",0);ids.Add((uint)id);members.Add(D("pid",(uint)id,"creationFileTime",null,"provenance","UNKNOWN_NOT_QUERIED"));}
    for(int i=0;i<ids.Count;i++)if(createdHere&&ids[i]==original.pid){var member=(Dictionary<string,object>)members[i];Api.Ft born,exit,kernel,user;bool ok=Api.GetProcessTimes(original.process,out born,out exit,out kernel,out user);int error=ok?0:Marshal.GetLastWin32Error();member["provenance"]=ok?"ORIGINAL_CREATION_HANDLE":"ORIGINAL_HANDLE_QUERY_FAILED";member["creationFileTime"]=ok?(object)U(born.Value):null;if(!ok)throw new Stop("JOB_ROOT_GENERATION_QUERY_FAILED",error);if(U(born.Value)!=processBorn)throw new Stop("JOB_ROOT_GENERATION_MISMATCH",0);}
    return snapshot;
   }finally{Marshal.FreeHGlobal(b);}
  }
  void RequireSingle(Dictionary<string,object> snapshot){var ids=(List<uint>)snapshot["listedPids"];if(ids.Count!=1||ids[0]!=original.pid)throw new Stop("EXTRA_OR_MISSING_JOB_MEMBER_NO_QUERY",0);}
  Dictionary<string,object> QueryOriginal(string phase){
   string start=Api.Tick();Api.Ft born,exit,kernel,user;
   Api.Need(Api.GetProcessTimes(original.process,out born,out exit,out kernel,out user),"RETAINED_ORIGINAL_PROCESS_QUERY_FAILED");
   string processExitTime=U(exit.Value);
   if(U(born.Value)!=processBorn||Api.GetProcessId(original.process)!=original.pid||!Membership(original.process,jobA))throw new Stop("RETAINED_ORIGINAL_GENERATION_OR_JOB_CHANGED",0);
   uint wait=Api.WaitForSingleObject(original.process,0);if(wait!=Api.WaitTimeout)throw new Stop("ORIGINAL_NODE_NOT_LIVE_FOR_CAPTURE",0);
   Api.Need(Api.GetThreadTimes(original.thread,out born,out exit,out kernel,out user),"RETAINED_ORIGINAL_THREAD_QUERY_FAILED");
   if(U(born.Value)!=threadBorn||Api.GetProcessIdOfThread(original.thread)!=original.pid||Api.WaitForSingleObject(original.thread,0)!=Api.WaitTimeout)throw new Stop("ORIGINAL_PRIMARY_THREAD_CHANGED",0);
   var image=new StringBuilder(32768);uint length=32768;Api.Need(Api.QueryFullProcessImageNameW(original.process,0,image,ref length),"ORIGINAL_NODE_IMAGE_QUERY_FAILED");if(!String.Equals(image.ToString(),NodeExe,StringComparison.OrdinalIgnoreCase))throw new Stop("ORIGINAL_NODE_IMAGE_MISMATCH",0);
   uint flags;bool mitigation=Api.GetProcessMitigationPolicy(original.process,4,out flags,new UIntPtr(4));int err=mitigation?0:Marshal.GetLastWin32Error();
   var threads=DesktopProof(phase); // Always required for this root; no Win32k substitute.
   return D("pid",original.pid,"queryStartQpc",start,"qpc",Api.Tick(),"creationFileTime",processBorn,"exitFileTime",processExitTime,"jobId","new22-job-A","imagePath",image.ToString(),"desktopId",boundary.DesktopName,
    "running",true,"inExpectedJob",true,"desktopObjectVerified",true,"win32kDisabled",mitigation&&(flags&1)!=0,"mitigationQuerySucceeded",mitigation,"mitigationFlags",mitigation?flags:0,"mitigationError",err,"threads",threads);
  }
  List<object> DesktopProof(string phase){
   IntPtr snapshot=IntPtr.Zero,marker=IntPtr.Zero;var proofs=new List<object>();var tids=new HashSet<uint>();var raw=new List<object>();bool complete=false;uint freeError=0;
   try{uint code=Api.PssCaptureSnapshot(original.process,0x80,0,out snapshot);if(code!=0)throw new Stop("PSS_OWNED_QUERY_RIGHTS_OR_API_FAILED",(int)code);code=Api.PssWalkMarkerCreate(IntPtr.Zero,out marker);if(code!=0)throw new Stop("PSS_MARKER_FAILED",(int)code);
    while(true){Api.PssThread entry;code=Api.PssWalkSnapshot(snapshot,3,marker,out entry,120);if(code==Api.NoMoreItems){complete=true;break;}if(code!=0)throw new Stop("PSS_THREAD_WALK_FAILED",(int)code);
     raw.Add(D("tid",entry.tid,"ownerPid",entry.pid,"creationFileTime",U(entry.create.Value),"flags",entry.flags));
     if(raw.Count>512||entry.pid!=original.pid||entry.tid==0||!tids.Add(entry.tid)||entry.flags!=0||entry.create.Value==0)throw new Stop("UNIDENTIFIED_OR_EXITED_PSS_THREAD",0);
     bool originalPrimary=entry.tid==original.tid;
     IntPtr thread=originalPrimary?original.thread:Api.OpenThread(0x00100800,false,entry.tid);Api.Need(Valid(thread),"PSS_DECLARED_THREAD_OPEN_FAILED");
     try{if(Api.GetProcessIdOfThread(thread)!=original.pid)throw new Stop("PSS_THREAD_OWNER_MISMATCH",0);Api.Ft born,exit,kernel,user;Api.Need(Api.GetThreadTimes(thread,out born,out exit,out kernel,out user),"PSS_THREAD_TIME_FAILED");if(born.Value!=entry.create.Value||Api.WaitForSingleObject(thread,0)!=Api.WaitTimeout)throw new Stop("PSS_THREAD_GENERATION_CHANGED",0);
      if(entry.tid==original.tid&&U(born.Value)!=threadBorn)throw new Stop("PRIMARY_THREAD_CREATION_NOT_ORIGINAL",0);
      IntPtr desktop=Api.GetThreadDesktop(entry.tid);int desktopError=desktop==IntPtr.Zero?Marshal.GetLastWin32Error():0; // Immediate; no clock/log/native call before error.
      var call=D("event","TARGET_DESKTOP_API_SPLIT","phase",phase,"pid",original.pid,"tid",entry.tid,"threadCreationFileTime",U(born.Value),"threadHandleSource",originalPrimary?"ORIGINAL_CREATION_HANDLE":"OWNED_PROCESS_PSS_QUERY_HANDLE","getThreadDesktopCompleted",true,"getThreadDesktopNonNull",desktop!=IntPtr.Zero,"getThreadDesktopError",desktop==IntPtr.Zero?(object)desktopError:null,"compareInvoked",false,"compareResult",null,"compareLastError",null);trace.Add(call);
      if(desktop==IntPtr.Zero)throw new Stop("GET_THREAD_DESKTOP_RETURNED_NULL",desktopError);
      bool same=Api.CompareObjectHandles(desktop,boundary.Desktop);call["compareInvoked"]=true;call["compareResult"]=same;
      if(!same)throw new Stop("DESKTOP_OBJECTS_NOT_SAME_COMPLETED_COMPARE",0); // FALSE is not an invented API-call error.
      proofs.Add(D("tid",entry.tid,"creationFileTime",U(born.Value),"sameDesktopObject",true));
     }finally{if(!originalPrimary&&!Api.CloseHandle(thread))throw new Stop("OWNED_THREAD_QUERY_HANDLE_CLOSE_FAILED",Marshal.GetLastWin32Error());}
    }
    if(proofs.Count==0||!tids.Contains(original.tid))throw new Stop("PSS_EMPTY_OR_PRIMARY_THREAD_MISSING",0);
   }finally{if(Valid(marker))freeError=Api.PssWalkMarkerFree(marker);if(Valid(snapshot)){uint e=Api.PssFreeSnapshot(Api.GetCurrentProcess(),snapshot);if(e!=0)freeError=e;}trace.Add(D("event","PSS_FULL_THREAD_SET","phase",phase,"complete",complete,"rawThreads",raw,"releaseError",freeError));if(freeError!=0)throw new Stop("PSS_LOCAL_METADATA_RELEASE_FAILED",(int)freeError);}
   return proofs;
  }

  // Optional rollback ONLY for the exact process returned by our CreateProcessW.
  // No PID lookup and no termination of any other member/helper.
  public bool AbortKnownRoot(){if(!createdHere||!Valid(original.process)||Api.GetProcessId(original.process)!=original.pid)return false;if(Api.WaitForSingleObject(original.process,0)==0)return true;bool result=Api.TerminateProcess(original.process,99);int error=result?0:Marshal.GetLastWin32Error();trace.Add(D("event","ABORT_EXACT_CREATED_ROOT_ONLY","pid",original.pid,"result",result,"win32",result?null:(object)error));return result;}
  uint Active(IntPtr job){int size=Marshal.SizeOf(typeof(Api.Accounting));IntPtr b=Marshal.AllocHGlobal(size);try{uint n;Api.Need(Api.QueryInformationJobObject(job,1,b,(uint)size,out n),"OWN_JOB_ACTIVE_QUERY_FAILED");return ((Api.Accounting)Marshal.PtrToStructure(b,typeof(Api.Accounting))).activeProcesses;}finally{Marshal.FreeHGlobal(b);}}
  // Bounded, repeatable read-only retirement attempts. Never close a kill-on-close
  // job with active/unknown members. Pending => primary MUST keep host + lease alive.
  public bool TryRelease(uint waitMilliseconds){
   if(releaseFailed)throw new Stop("RELEASE_PREVIOUSLY_FAILED_NO_RETRY",0);if(released){if(!releaseReceiptsWritten)throw new Stop("RELEASED_BUT_EXIT_RECEIPT_MISSING",0);return true;}if(waitMilliseconds>2000)throw new ArgumentOutOfRangeException("waitMilliseconds");
   bool exited=!createdHere||Api.WaitForSingleObject(original.process,waitMilliseconds)==0;uint a=Valid(jobA)?Active(jobA):0,b=Valid(jobB)?Active(jobB):0;
   if(!exited||a!=0||b!=0){Save("retirement-pending-"+(++retireAttempt)+".json",D("originalRootExited",exited,"activeInA",a,"activeInB",b,"jobsClosed",false,"unknownProcessesQueriedOrTerminated",false,"primaryMustKeepHostAlive",true));return false;}
   uint exitCode=0;if(createdHere)Api.Need(Api.GetExitCodeProcess(original.process,out exitCode),"ORIGINAL_EXIT_CODE_FAILED");
   bool attemptedJobA=Valid(jobA);
   bool threadClosed=CloseOwned(ref original.thread),processClosed=CloseOwned(ref original.process);
   bool aClosed=CloseOwned(ref jobA),bClosed=CloseOwned(ref jobB);released=threadClosed&&processClosed&&aClosed&&bClosed;
   if(!released){releaseFailed=true;throw new Stop("OWNED_HANDLE_RELEASE_FAILED_NO_BLIND_RETRY",0);}
   Save("cleanup.json",D("captureId",captureId,"savedBeforeClose",saved,"processHandleCloseAttempts",createdHere?1:0,"releasesSucceeded",released,"queryJobHandleCloseAttempted",attemptedJobA,"borrowedDesktopClosed",false,"executionAuthorized",false,"closedQpc",Api.Tick()));
   Save("exit-receipt.json",D("originalPid",original.pid,"originalCreationFileTime",processBorn,"originalThreadId",original.tid,"originalThreadCreationFileTime",threadBorn,"waitSignaled",exited,"exitCode",exitCode,"allOwnedJobsEmptyBeforeClose",true,"unknownPidTouched",false,"controlledIpcExit",false,"nativeCaptureStatus",receipt["status"]));releaseReceiptsWritten=true;return true;
  }
  bool CloseOwned(ref IntPtr handle){if(!Valid(handle))return true;bool ok=Api.CloseHandle(handle);int error=ok?0:Marshal.GetLastWin32Error();trace.Add(D("event","CLOSE_OWNED_HANDLE","success",ok,"win32",ok?null:(object)error));if(ok)handle=IntPtr.Zero;return ok;}
 }
}

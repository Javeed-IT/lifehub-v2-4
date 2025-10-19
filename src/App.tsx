
import React, { useEffect, useMemo, useState } from "react";

type Txn = { id: string; date: string; type: "income" | "expense"; category: string; amount: number; note?: string; };
type HealthEntry = { id: string; date: string; weightKg?: number; sleepHrs?: number; steps?: number; mood?: "😀" | "🙂" | "😐" | "😕" | "😞"; };
type Meal = { id: string; date: string; mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack"; name: string; calories?: number; };
type Task = { id: string; title: string; due?: string; done: boolean; recur?: "none" | "daily" | "weekly"; area?: "Finance" | "Health" | "Diet" | "Life" | "Career"; };
type Note = { id: string; text: string; pinned?: boolean; created: string };
type ReadingItem = { id: string; title: string; status: "finished" | "current" | "upcoming"; };

type Store = {
  txns: Txn[]; health: HealthEntry[]; meals: Meal[]; tasks: Task[]; notes: Note[];
  emergencyFundTarget: number; emergencyFundName: string; emergencyFundBalance: number; monthlyExpenseBaseline: number;
  budgets: Record<string, number>;
  nightShiftMode: boolean;
  weeklyHabits: { weekStart: string; gym: boolean[]; swim: boolean[]; water: number[]; callFamily: boolean[]; };
  reading: ReadingItem[];
};

const KEY = "lifehub.v2.javeed";
const CATS = ["Rent","Food/Grocery","Phone Bill","Transport","Gym","Restaurants","Other"] as const;
const startOfWeek = (d: Date) => { const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; };
const fmtGBP = (n: number) => new Intl.NumberFormat("en-GB",{style:"currency", currency:"GBP"}).format(n);
const monthKey = (d: Date)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;

function useStore(): [Store, (s: Store) => void] {
  const blank: Store = {
    txns: [], health: [], meals: [], tasks: [
      { id: crypto.randomUUID(), title: "Daily WhatsApp call – Mum & Sis", done: false, recur: "daily", area: "Life" },
      { id: crypto.randomUUID(), title: "Swim (2x / week)", done: false, recur: "weekly", area: "Health" },
      { id: crypto.randomUUID(), title: "Gym (2x / week)", done: false, recur: "weekly", area: "Health" },
      { id: crypto.randomUUID(), title: "Update GitHub portfolio/screenshots", done: false, recur: "weekly", area: "Career" },
      { id: crypto.randomUUID(), title: "CompTIA A+: 2 hrs study", done: false, recur: "daily", area: "Career" },
    ],
    notes: [{ id: crypto.randomUUID(), text: "Dream: IT Engineer / SysAdmin. ILR by Nov 2026. Healthy • Wealthy • Happy.", pinned: true, created: new Date().toISOString() }],
    emergencyFundTarget: 2000, emergencyFundName: "Emergency Fund", emergencyFundBalance: 0, monthlyExpenseBaseline: 1000,
    budgets: { "Rent":800, "Food/Grocery":250, "Phone Bill":30, "Transport":80, "Gym":25, "Restaurants":60, "Other":100 },
    nightShiftMode: true,
    weeklyHabits: { weekStart: startOfWeek(new Date()).toISOString().slice(0,10), gym:Array(7).fill(false), swim:Array(7).fill(false), water:Array(7).fill(0), callFamily:Array(7).fill(false) },
    reading: [
      { id: crypto.randomUUID(), title: "Clear Thinking", status: "finished" },
      { id: crypto.randomUUID(), title: "The Psychology of Money", status: "finished" },
      { id: crypto.randomUUID(), title: "Atomic Habits", status: "current" },
      { id: crypto.randomUUID(), title: "Deep Work", status: "upcoming" }
    ]
  };
  const [store, setStore] = useState<Store>(()=>{ try{ const raw=localStorage.getItem(KEY); return raw?{...blank, ...JSON.parse(raw)}:blank;}catch{return blank;}});
  useEffect(()=>{ localStorage.setItem(KEY, JSON.stringify(store)); },[store]);
  useEffect(()=>{ const nowMonday=startOfWeek(new Date()).toISOString().slice(0,10); if(store.weeklyHabits.weekStart!==nowMonday){ setStore({...store, weeklyHabits:{weekStart:nowMonday, gym:Array(7).fill(false), swim:Array(7).fill(false), water:Array(7).fill(0), callFamily:Array(7).fill(false)}});} },[]);
  return [store, setStore];
}

const Section: React.FC<{ title: string; right?: React.ReactNode; className?: string }>=({title,right,className,children})=>(
  <section className={`mb-6 ${className??""}`}>
    <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-semibold">{title}</h2>{right}</div>
    <div className="bg-white/70 dark:bg-zinc-900/60 rounded-2xl shadow p-4">{children}</div>
  </section>
);
const TabButton: React.FC<{active:boolean; onClick:()=>void; label:string}>=({active,onClick,label})=>(<button onClick={onClick} className={`px-3 py-2 rounded-xl text-sm font-medium border ${active?"bg-zinc-900 text-white border-zinc-900":"bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"}`}>{label}</button>);
const ProgressBar: React.FC<{value:number;max:number}>=({value,max})=>{ const pct=Math.min(100,Math.max(0,(value/max)*100||0)); return <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-3 bg-emerald-500" style={{width:pct+"%"}}/></div>};
const download=(filename:string,content:string,type="text/plain")=>{ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); };

export default function App(){
  const [store, setStore] = useStore();
  const [tab, setTab] = useState<"Home"|"Finance"|"Budgets"|"Health"|"Diet"|"Plan"|"Career"|"Reading"|"Notes">("Home");
  const [dark, setDark] = useState(true);
  const todayIdx = (new Date().getDay()+6)%7;
  const mk = monthKey(new Date());

  useEffect(()=>{ document.documentElement.classList.toggle("dark",dark); document.documentElement.classList.add("bg-zinc-50","dark:bg-zinc-950"); },[dark]);

  const monthTxns = useMemo(()=> store.txns.filter(t=> t.date?.startsWith(mk) && t.type==="expense"), [store.txns, mk]);
  const spendByCat = useMemo(()=> {
    const map: Record<string, number> = {}; for (const c of CATS) map[c]=0;
    for (const t of monthTxns) map[t.category] = (map[t.category]||0) + Math.abs(t.amount); return map;
  }, [monthTxns]);
  const totals = useMemo(()=>{
    const income = store.txns.filter(t=>t.type==="income").reduce((a,b)=>a+b.amount,0);
    const expense = store.txns.filter(t=>t.type==="expense").reduce((a,b)=>a+b.amount,0);
    return { income, expense, net: income - expense };
  },[store.txns]);

  const sixMonthTarget = store.monthlyExpenseBaseline*6;
  const sixMonthsAchieved = store.emergencyFundBalance >= sixMonthTarget;

  const [txnDraft,setTxnDraft]=useState<Partial<Txn>>({date:new Date().toISOString().slice(0,10), type:"expense", category:"Rent", amount:0});
  const [quickCatAmount,setQuickCatAmount]=useState<Record<string, number>>({});
  const [efAdjust,setEfAdjust]=useState<number>(0);
  const [healthDraft,setHealthDraft]=useState<Partial<HealthEntry>>({date:new Date().toISOString().slice(0,10)});
  const [mealDraft,setMealDraft]=useState<Partial<Meal>>({date:new Date().toISOString().slice(0,10), mealType:"Breakfast"});
  const [taskTitle,setTaskTitle]=useState(""); const [taskArea,setTaskArea]=useState<Task["area"]>("Life");
  const [readingDraft,setReadingDraft]=useState("");

  const addTxn=()=>{ if (!txnDraft.amount || !txnDraft.date || !txnDraft.type || !txnDraft.category){ alert("Fill amount, date, type, category"); return; } const t: Txn = { id: crypto.randomUUID(), date: txnDraft.date!, type: txnDraft.type!, category: txnDraft.category!, amount: Number(txnDraft.amount), note: txnDraft.note }; setStore({ ...store, txns: [t, ...store.txns] }); setTxnDraft({ date: new Date().toISOString().slice(0,10), type:"expense", category:"Rent", amount: 0 }); };
  const addExpenseForCategory=(cat:string, amt:number)=>{ if (!amt || amt<=0) return; const t: Txn = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0,10), type:"expense", category: cat, amount: amt, note: "Quick add" }; setStore({ ...store, txns: [t, ...store.txns] }); setQuickCatAmount({ ...quickCatAmount, [cat]: 0 }); };
  const exportCSV=()=>{ const header=["date","type","category","amount","note"]; const rows=store.txns.map(t=>[t.date,t.type,t.category,t.amount,(t.note||"").replaceAll('"','""')]); const csv=[header,...rows].map(r=> r.map(x=> typeof x==="string"?`"${x}"`:x).join(",")).join("\\n"); download(`lifehub-transactions-${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv"); };

  const reading = { finished: store.reading.filter(r=> r.status==="finished"), current: store.reading.filter(r=> r.status==="current"), upcoming: store.reading.filter(r=> r.status==="upcoming") };
  const suggestNextBooks=()=>{ const have=new Set(store.reading.map(r=>r.title.toLowerCase())); return ["So Good They Can't Ignore You","Make Time","The Compound Effect","UltraLearning","Deep Work","Digital Minimalism","The Pragmatic Programmer","Clean Code"].filter(t=>!have.has(t.toLowerCase())).slice(0,4); };

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">💫</span>
          <div className="flex-1">
            <h1 className="text-lg font-bold">LifeHub — Javeed</h1>
            <p className="text-xs opacity-70">Budgets + All tabs • {mk}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={()=>setDark(!dark)}>{dark?"Light":"Dark"} mode</button>
            <button className="btn" onClick={()=>download(`lifehub-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(store,null,2), "application/json")}>Export</button>
            <button className="btn" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-5 flex-wrap">
          {["Home","Finance","Budgets","Health","Diet","Plan","Career","Reading","Notes"].map((t)=> (<TabButton key={t} label={t} active={tab===t} onClick={()=>setTab(t as any)} />))}
        </div>

        {tab==="Home" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Emergency Fund">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">{store.emergencyFundName}</div>
                  <div className="text-2xl font-bold">{fmtGBP(store.emergencyFundBalance)} / {fmtGBP(store.emergencyFundTarget)}</div>
                  <div className="mt-2"><ProgressBar value={store.emergencyFundBalance} max={store.emergencyFundTarget} /></div>
                  {store.emergencyFundBalance>=store.emergencyFundTarget && <div className="text-xs mt-2 bg-emerald-600/20 rounded px-2 py-1 inline-block">Goal reached — add more?</div>}
                  {sixMonthsAchieved && <div className="text-xs mt-2 bg-emerald-600/20 rounded px-2 py-1 inline-block">🎉 Six months secured!</div>}
                </div>
                <div className="space-y-2">
                  <input className="input" type="number" placeholder="Adjust (e.g., 50 or -20)" value={efAdjust} onChange={e=> setEfAdjust(Number(e.target.value))} />
                  <div className="flex gap-2">
                    <button className="btn" onClick={()=> setStore({...store, emergencyFundBalance: Math.max(0, store.emergencyFundBalance + Number(efAdjust||0))})}>Apply</button>
                    <button className="btn" onClick={()=> setEfAdjust(0)}>Clear</button>
                  </div>
                  <input className="input" type="number" placeholder="Monthly expenses baseline" value={store.monthlyExpenseBaseline} onChange={e=> setStore({...store, monthlyExpenseBaseline:Number(e.target.value)})} />
                  <div className="text-xs opacity-70">Six months target: <b>{fmtGBP(sixMonthTarget)}</b></div>
                </div>
              </div>
            </Section>

            <Section title="Net cash (all transactions)">
              <div className="text-2xl font-bold">{fmtGBP(totals.net)}</div>
              <div className="text-sm mt-1">Income {fmtGBP(totals.income)} • Spend {fmtGBP(totals.expense)}</div>
            </Section>
          </div>
        )}

        {tab==="Finance" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Add transaction">
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="input" type="date" value={txnDraft.date||""} onChange={e=>setTxnDraft({...txnDraft, date:e.target.value})} />
                <select className="input" value={txnDraft.type} onChange={e=>setTxnDraft({...txnDraft, type:e.target.value as any})}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select className="input" value={txnDraft.category} onChange={e=>setTxnDraft({...txnDraft, category:e.target.value})}>
                  {([...CATS] as string[]).map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="input" placeholder="Amount" type="number" step="0.01" value={txnDraft.amount?.toString()||""} onChange={e=>setTxnDraft({...txnDraft, amount:Number(e.target.value)})} />
                <input className="input sm:col-span-2" placeholder="Note (optional)" value={txnDraft.note||""} onChange={e=>setTxnDraft({...txnDraft, note:e.target.value})} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn" onClick={addTxn}>Add</button>
                <button className="btn" onClick={exportCSV}>Export CSV</button>
              </div>
            </Section>

            <Section title={`Quick add — ${mk}`}>
              <div className="grid sm:grid-cols-2 gap-3">
                {CATS.map(c=> (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-28 text-sm">{c}</div>
                    <input className="input w-28" type="number" placeholder="£" value={quickCatAmount[c]||""} onChange={e=> setQuickCatAmount({...quickCatAmount, [c]: Number(e.target.value)})} />
                    <button className="btn" onClick={()=> addExpenseForCategory(c, Number(quickCatAmount[c]||0))}>Add</button>
                    <div className="text-xs opacity-70 ml-auto">{fmtGBP(spendByCat[c]||0)} / {fmtGBP(store.budgets[c]||0)}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {tab==="Budgets" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title={`This month — ${mk}`}>
              <div className="space-y-3">
                {CATS.map(c=> {
                  const spent = spendByCat[c]||0; const target = store.budgets[c]||0;
                  const over = spent>target && target>0;
                  return (
                    <div key={c}>
                      <div className="flex justify-between text-sm mb-1">
                        <div>{c}</div>
                        <div>{fmtGBP(spent)} / {fmtGBP(target)}</div>
                      </div>
                      <div className={`h-3 rounded-full overflow-hidden ${over?"ring-2 ring-rose-500":""}`}>
                        <div className={`${over?"bg-rose-500":"bg-emerald-500"}`} style={{width: `${Math.min(100, target? (spent/target)*100 : 0)}%`, height:"100%"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Set / change budgets">
              <div className="space-y-2">
                {CATS.map(c=> (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-32 text-sm">{c}</div>
                    <input className="input w-32" type="number" value={store.budgets[c]||0} onChange={e=> setStore({...store, budgets:{...store.budgets, [c]: Number(e.target.value)}})} />
                  </div>
                ))}
                <div className="text-xs opacity-70">Tip: Budgets are monthly. Bar turns red if you go over.</div>
              </div>
            </Section>
          </div>
        )}

        {tab==="Health" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Section title="Add health entry">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className="input" type="date" value={healthDraft.date||""} onChange={e=>setHealthDraft({...healthDraft, date:e.target.value})} />
                  <select className="input" value={healthDraft.mood||""} onChange={e=>setHealthDraft({...healthDraft, mood:e.target.value as any})}>
                    <option value="">Mood</option>
                    {"😀🙂😐😕😞".split("").map(m=> <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input className="input" placeholder="Weight (kg)" type="number" step="0.1" value={healthDraft.weightKg?.toString()||""} onChange={e=>setHealthDraft({...healthDraft, weightKg:Number(e.target.value)})} />
                  <input className="input" placeholder="Sleep (hrs)" type="number" step="0.1" value={healthDraft.sleepHrs?.toString()||""} onChange={e=>setHealthDraft({...healthDraft, sleepHrs:Number(e.target.value)})} />
                  <input className="input sm:col-span-2" placeholder="Steps" type="number" value={healthDraft.steps?.toString()||""} onChange={e=>setHealthDraft({...healthDraft, steps:Number(e.target.value)})} />
                </div>
                <div className="mt-3"><button className="btn" onClick={()=>{
                  const h: HealthEntry = { id: crypto.randomUUID(), date: healthDraft.date!, weightKg: healthDraft.weightKg?Number(healthDraft.weightKg):undefined, sleepHrs: healthDraft.sleepHrs?Number(healthDraft.sleepHrs):undefined, steps: healthDraft.steps?Number(healthDraft.steps):undefined, mood: healthDraft.mood as any };
                  setStore({ ...store, health: [h, ...store.health] }); setHealthDraft({ date: new Date().toISOString().slice(0,10) });
                }}>Add</button></div>
              </Section>

              <Section title="Weekly habits (Mon–Sun)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left opacity-70">
                      <tr><th className="py-2">Habit</th>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=> <th key={d} className={`py-2 ${i===todayIdx?"underline":''}`}>{d}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[{key:"swim", label:"Swim"}, {key:"gym", label:"Gym"}].map(row=> (
                        <tr key={row.key} className="border-t border-zinc-200 dark:border-zinc-800">
                          <td className="py-2">{row.label}</td>
                          {store.weeklyHabits[row.key as "swim"|"gym"].map((v,i)=> (
                            <td key={i}>
                              <input type="checkbox" checked={v} onChange={()=> setStore({...store, weeklyHabits: { ...store.weeklyHabits, [row.key]: store.weeklyHabits[row.key as "swim"|"gym"].map((x,idx)=> idx===i?!x:x) }})} />
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="py-2">Water (glasses)</td>
                        {store.weeklyHabits.water.map((v,i)=> (
                          <td key={i}><input className="input !p-1 w-16" type="number" value={v} onChange={(e)=> setStore({...store, weeklyHabits: { ...store.weeklyHabits, water: store.weeklyHabits.water.map((x,idx)=> idx===i?Number(e.target.value):x) }})} /></td>
                        ))}
                      </tr>
                      <tr className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="py-2">Call family</td>
                        {store.weeklyHabits.callFamily.map((v,i)=> (
                          <td key={i}><input type="checkbox" checked={v} onChange={()=> setStore({...store, weeklyHabits: { ...store.weeklyHabits, callFamily: store.weeklyHabits.callFamily.map((x,idx)=> idx===i?!x:x) }})} /></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Health history">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left opacity-70"><tr><th className="py-2">Date</th><th>Weight</th><th>Sleep</th><th>Steps</th><th>Mood</th></tr></thead>
                    <tbody>
                      {store.health.map(h=> (<tr key={h.id} className="border-t border-zinc-200 dark:border-zinc-800"><td className="py-2">{h.date}</td><td>{h.weightKg??"—"}</td><td>{h.sleepHrs??"—"}</td><td>{h.steps??"—"}</td><td>{h.mood??"—"}</td></tr>))}
                      {store.health.length===0 && <tr><td className="py-2" colSpan={5}>No entries yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <div>
              <Section title="Night-shift mode">
                <p className="text-sm opacity-80">Shifts flip your day: track sleep after night duties and hydrate.</p>
                <div className="mt-2 flex items-center gap-2">
                  <button className="btn" onClick={()=> setStore({...store, nightShiftMode: !store.nightShiftMode})}>{store.nightShiftMode?"🌙 On":"☀️ Off"}</button>
                </div>
              </Section>

              <Section title="Diet – quick log">
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" type="date" value={mealDraft.date||""} onChange={e=>setMealDraft({...mealDraft, date:e.target.value})} />
                    <select className="input" value={mealDraft.mealType} onChange={e=>setMealDraft({...mealDraft, mealType: e.target.value as any})}>
                      {["Breakfast","Lunch","Dinner","Snack"].map(m=> <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <input className="input" placeholder="Meal name" value={mealDraft.name||""} onChange={e=>setMealDraft({...mealDraft, name:e.target.value})} />
                  <input className="input" placeholder="Calories (optional)" type="number" value={mealDraft.calories?.toString()||""} onChange={e=>setMealDraft({...mealDraft, calories: Number(e.target.value)})} />
                  <button className="btn" onClick={()=>{
                    if (!mealDraft.name){ alert("Add meal name"); return; }
                    const m: Meal = { id: crypto.randomUUID(), date: mealDraft.date!, mealType: mealDraft.mealType as any, name: mealDraft.name!, calories: mealDraft.calories?Number(mealDraft.calories):undefined };
                    setStore({ ...store, meals: [m, ...store.meals] });
                    setMealDraft({ date: new Date().toISOString().slice(0,10), mealType:"Breakfast" });
                  }}>Add meal</button>
                </div>
              </Section>
            </div>
          </div>
        )}

        {tab==="Diet" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Meal log">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left opacity-70"><tr><th className="py-2">Date</th><th>Meal</th><th>Name</th><th>Calories</th></tr></thead>
                  <tbody>
                    {store.meals.map(m=> (<tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800"><td className="py-2">{m.date}</td><td>{m.mealType}</td><td>{m.name}</td><td>{m.calories??"—"}</td></tr>))}
                    {store.meals.length===0 && <tr><td className="py-2" colSpan={4}>No meals yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Section>
            <Section title="Daily water tracker">
              <div className="flex items-center gap-2">
                <button className="btn" onClick={()=> setStore({ ...store, weeklyHabits: { ...store.weeklyHabits, water: store.weeklyHabits.water.map((v,i)=> i===todayIdx?Math.max(0,v-1):v ) } })}>−1</button>
                <div className="text-2xl font-bold">{store.weeklyHabits.water[todayIdx]} glasses</div>
                <button className="btn" onClick={()=> setStore({ ...store, weeklyHabits: { ...store.weeklyHabits, water: store.weeklyHabits.water.map((v,i)=> i===todayIdx?Math.min(20,v+1):v ) } })}>+1</button>
              </div>
            </Section>
          </div>
        )}

        {tab==="Plan" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Section title="Tasks & goals">
                <div className="flex gap-2 mb-3">
                  <input className="input flex-1" placeholder="Add a task (e.g., Push to GitHub, Apply to 3 IT roles)" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />
                  <select className="input" value={taskArea} onChange={e=>setTaskArea(e.target.value as any)}>
                    {(["Life","Finance","Health","Diet","Career"] as const).map(a=> <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button className="btn" onClick={()=>{ if(!taskTitle.trim()) return; const t: Task = { id: crypto.randomUUID(), title: taskTitle.trim(), done:false, recur:"none", area: taskArea }; setStore({ ...store, tasks: [t, ...store.tasks] }); setTaskTitle(""); }}>Add</button>
                </div>
                <div className="space-y-2">
                  {store.tasks.map(t=> (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <input type="checkbox" checked={t.done} onChange={()=> setStore({ ...store, tasks: store.tasks.map(x=> x.id===t.id?{...x, done:!x.done}:x) })} />
                      <div className={`flex-1 ${t.done?"line-through opacity-60":""}`}>
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs opacity-70">Area: {t.area ?? "Life"} {t.recur && t.recur!=="none"?`• ${t.recur}`:""}</div>
                      </div>
                      <button className="text-xs px-2 py-1 rounded-lg border" onClick={()=> setStore({ ...store, tasks: store.tasks.filter(x=> x.id!==t.id) })}>Delete</button>
                    </div>
                  ))}
                  {store.tasks.length===0 && <div className="text-sm opacity-70">No tasks yet.</div>}
                </div>
              </Section>
            </div>

            <div>
              <Section title="Focus presets">
                <div className="grid gap-2 text-sm">
                  <button className="btn" onClick={()=> setStore({...store, tasks:[{id:crypto.randomUUID(), title:"Apply to 3 IT jobs today", done:false, area:"Career"}, ...store.tasks]})}>🎯 Job hunt sprint</button>
                  <button className="btn" onClick={()=> setStore({...store, tasks:[{id:crypto.randomUUID(), title:"Finish one lab & push to GitHub", done:false, area:"Career"}, ...store.tasks]})}>🧪 Lab → GitHub</button>
                  <button className="btn" onClick={()=> setStore({...store, tasks:[{id:crypto.randomUUID(), title:"Meal prep for night shifts", done:false, area:"Diet"}, ...store.tasks]})}>🥗 Meal prep</button>
                </div>
              </Section>
            </div>
          </div>
        )}

        {tab==="Career" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="CompTIA A+ roadmap (next)">
              <ol className="list-decimal ml-5 text-sm space-y-1">
                <li>Core 1 (220-1101): mobile devices, networking, hardware, virtualization/cloud, troubleshooting</li>
                <li>Core 2 (220-1102): OS (Windows, Linux, macOS), security, software troubleshooting, operational procedures</li>
                <li>Study routine: 2 hrs/day → practice labs → take practice tests (80%+)</li>
                <li>Exam plan: book Core 1 → 2–4 weeks later book Core 2</li>
              </ol>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {["Watch module & take notes","Do hands-on lab","Make Anki cards","Score 80% on practice test","Book exam"].map(t=>(
                  <button key={t} className="btn" onClick={()=> setStore({...store, tasks:[{id:crypto.randomUUID(), title:`A+: ${t}`, done:false, area:"Career"}, ...store.tasks]})}>{t}</button>
                ))}
              </div>
            </Section>

            <Section title="GitHub upload checklist">
              <ul className="text-sm space-y-1 list-disc ml-5">
                <li>Meaningful repo name (e.g., <code>windows-server-2022-lab</code>)</li>
                <li>README with: goal, architecture diagram/screenshot, steps, results</li>
                <li>Folder: <code>screenshots/</code> (numbered), <code>powershell/</code> (scripts), <code>configs/</code></li>
                <li>Use commits: one logical change per commit with clear message</li>
                <li>Pin top 6 repos on GitHub profile</li>
              </ul>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {["Create repo + README","Add screenshots","Push scripts/configs","Write results section","Pin repo"].map(t=>(
                  <button key={t} className="btn" onClick={()=> setStore({...store, tasks:[{id:crypto.randomUUID(), title:`GitHub: ${t}`, done:false, area:"Career"}, ...store.tasks]})}>{t}</button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {tab==="Reading" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Section title="Reading list">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Finished</div>
                    <ul className="space-y-1">{reading.finished.map(b=> <li key={b.id}>✅ {b.title}</li>)}</ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Current</div>
                    <ul className="space-y-1">{reading.current.map(b=> <li key={b.id}>📖 {b.title}</li>)}</ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Upcoming</div>
                    <ul className="space-y-1">{reading.upcoming.map(b=> <li key={b.id}>🗓️ {b.title}</li>)}</ul>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <input className="input flex-1" placeholder="Add a book (title)" value={readingDraft} onChange={e=>setReadingDraft(e.target.value)} />
                  <button className="btn" onClick={()=>{ if(!readingDraft.trim()) return; setStore({...store, reading:[{id:crypto.randomUUID(), title:readingDraft.trim(), status:"upcoming"}, ...store.reading]}); setReadingDraft(""); }}>Add to Upcoming</button>
                </div>
              </Section>

              <Section title="Mark progress">
                <div className="text-xs opacity-70 mb-2">Click a book to cycle status: finished → current → upcoming</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {store.reading.map(b=> (
                    <button key={b.id} className="btn text-left" onClick={()=>{
                      const order: Record<ReadingItem["status"], ReadingItem["status"]> = { finished: "current", current: "upcoming", upcoming: "finished" } as any;
                      setStore({...store, reading: store.reading.map(x=> x.id===b.id?{...x, status: order[b.status]}:x)});
                    }}>{b.status==="finished"?"✅":b.status==="current"?"📖":"🗓️"} {b.title}</button>
                  ))}
                </div>
              </Section>
            </div>

            <div>
              <Section title="Suggestions for you">
                <div className="text-sm space-y-2">
                  {suggestNextBooks().map(s=> (
                    <div key={s} className="flex items-center justify-between border rounded-xl px-3 py-2">
                      <span>📚 {s}</span>
                      <button className="btn" onClick={()=> setStore({...store, reading:[{id:crypto.randomUUID(), title:s, status:"upcoming"}, ...store.reading]})}>Add</button>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        )}

        {tab==="Notes" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Quick note">
              <NoteEditor onAdd={(text)=> setStore({...store, notes:[{ id:crypto.randomUUID(), text, created:new Date().toISOString(), pinned:false }, ...store.notes]})} />
            </Section>
            <Section title="All notes">
              <div className="space-y-2">
                {store.notes.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || b.created.localeCompare(a.created)).map(n=> (
                  <div key={n.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs opacity-60 mb-1">{new Date(n.created).toLocaleString()}</div>
                    <div className="whitespace-pre-wrap text-sm">{n.text}</div>
                    <div className="mt-2 flex gap-2 text-xs">
                      <button className="px-2 py-1 rounded-lg border" onClick={()=> setStore({...store, notes: store.notes.map(x=> x.id===n.id?{...x, pinned:!x.pinned}:x)})}>{n.pinned?"Unpin":"Pin"}</button>
                      <button className="px-2 py-1 rounded-lg border" onClick={()=> setStore({...store, notes: store.notes.filter(x=> x.id!==n.id)})}>Delete</button>
                    </div>
                  </div>
                ))}
                {store.notes.length===0 && <div className="text-sm opacity-70">No notes yet.</div>}
              </div>
            </Section>
          </div>
        )}
      </main>

      <style>{`
        .input{ padding: .5rem .75rem; border-radius: .75rem; border: 1px solid rgb(63 63 70/.6) }
        .btn{ padding: .5rem .75rem; border-radius: .75rem; border: 1px solid rgb(63 63 70/.6) }
      `}</style>
    </div>
  );
}

const NoteEditor: React.FC<{ onAdd: (text:string)=>void }>=({onAdd})=>{
  const [v,setV]=useState("");
  return (
    <div>
      <textarea className="input h-28" placeholder="Type your note (gratitude, ideas, plans)…" value={v} onChange={e=>setV(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <button className="btn" onClick={()=>{ if(v.trim()) { onAdd(v.trim()); setV(""); } }}>Add note</button>
        <button className="btn" onClick={()=>setV("")}>Clear</button>
      </div>
    </div>
  );
};

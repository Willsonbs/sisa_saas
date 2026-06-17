import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function startOfWeek(d: Date) {
  const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); dt.setHours(0,0,0,0); return dt;
}
function addDays(d: Date, n: number) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function fmtShort(d: Date) { return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; }
function fmtTime(d: Date) { return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

const STATUS_COLOR: Record<string,string> = {
  confirmed:"bg-blue-500", completed:"bg-green-600", cancelled:"bg-red-400",
  canceled_with_credit:"bg-orange-400", no_show:"bg-gray-400", pending_payment:"bg-yellow-500",
};
const STATUS_LABEL: Record<string,string> = {
  confirmed:"Confirmada", completed:"Concluída", cancelled:"Cancelada",
  canceled_with_credit:"Cancelada c/ crédito", no_show:"No-show", pending_payment:"Aguardando pagamento",
};

export default function AdminCalendar() {
  const [view, setView] = useState<"week"|"day">("week");
  const [anchor, setAnchor] = useState(() => { const d=new Date(); d.setHours(0,0,0,0); return d; });
  const [filterRoom, setFilterRoom] = useState<string>("all");

  const { weekStart, weekEnd } = useMemo(() => {
    if (view==="week") { const ws=startOfWeek(anchor); return { weekStart:ws, weekEnd:addDays(ws,7) }; }
    const d=new Date(anchor); d.setHours(0,0,0,0); return { weekStart:d, weekEnd:addDays(d,1) };
  }, [anchor, view]);

  const { data: bookings=[], isLoading } = trpc.admin.listAllBookings.useQuery(
    { startDate:weekStart, endDate:weekEnd, roomId: filterRoom!=="all"?parseInt(filterRoom):undefined },
    { refetchOnWindowFocus:false }
  );
  const { data: rooms=[] } = trpc.rooms.list.useQuery({ includeInactive:false });

  const days = view==="week" ? Array.from({length:7},(_,i)=>addDays(startOfWeek(anchor),i)) : [new Date(anchor)];
  const hours = Array.from({length:15},(_,i)=>i+7);

  function navigate(dir:-1|1) { setAnchor(prev=>addDays(prev,dir*(view==="week"?7:1))); }
  function goToday() { const d=new Date(); d.setHours(0,0,0,0); setAnchor(d); }

  const bookingsByDay = useMemo(() => {
    const map: Record<string,typeof bookings> = {};
    for (const b of bookings) { const key=new Date(b.startTime).toDateString(); if(!map[key]) map[key]=[]; map[key].push(b); }
    return map;
  }, [bookings]);

  const today = new Date(); today.setHours(0,0,0,0);
  const ws = startOfWeek(anchor);
  const headerLabel = view==="week"
    ? `${fmtShort(ws)} a ${fmtShort(addDays(ws,6))} — ${MONTHS_PT[anchor.getMonth()]} ${anchor.getFullYear()}`
    : `${DAYS_PT[anchor.getDay()]}, ${anchor.getDate()} de ${MONTHS_PT[anchor.getMonth()]} de ${anchor.getFullYear()}`;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Reservas</h1>
          <p className="text-muted-foreground mt-1">Visualize todas as reservas por prestador e sala</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>HOJE</Button>
          <Button variant="ghost" size="icon" onClick={()=>navigate(-1)}><ChevronLeft className="h-4 w-4"/></Button>
          <Button variant="ghost" size="icon" onClick={()=>navigate(1)}><ChevronRight className="h-4 w-4"/></Button>
          <span className="text-sm font-medium min-w-[220px]">{headerLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Todas as salas"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as salas</SelectItem>
                {rooms.map(r=><SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md overflow-hidden">
              {(["day","week"] as const).map(v=>(
                <button key={v} onClick={()=>setView(v)}
                  className={`px-3 py-1 text-sm ${view===v?"bg-primary text-primary-foreground":"bg-background text-foreground hover:bg-muted"}`}>
                  {v==="day"?"DIA":"SEMANA"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_LABEL).map(([k,v])=>(
            <div key={k} className="flex items-center gap-1">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLOR[k]}`}/>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>

        <div className="border rounded-lg overflow-auto bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mr-2 animate-pulse"/> Carregando reservas...
            </div>
          ) : (
            <table className="w-full border-collapse text-sm" style={{minWidth:view==="week"?900:400}}>
              <thead>
                <tr>
                  <th className="w-14 border-b border-r bg-muted/30 sticky left-0 z-10"/>
                  {days.map(day=>{
                    const isToday=sameDay(day,today);
                    return (
                      <th key={day.toISOString()} className={`border-b border-r py-2 px-1 text-center font-medium ${isToday?"bg-primary/5":"bg-muted/20"}`}>
                        <div className={`text-xs uppercase ${isToday?"text-primary font-bold":"text-muted-foreground"}`}>{DAYS_PT[day.getDay()]}</div>
                        <div className={`text-base font-bold ${isToday?"text-primary":""}`}>{day.getDate()}/{String(day.getMonth()+1).padStart(2,"0")}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour=>(
                  <tr key={hour} className="h-14">
                    <td className="border-b border-r bg-muted/10 text-xs text-muted-foreground text-right pr-2 pt-1 sticky left-0 z-10 align-top w-14">
                      {String(hour).padStart(2,"0")}:00
                    </td>
                    {days.map(day=>{
                      const dayKey=day.toDateString();
                      const dayBookings=(bookingsByDay[dayKey]||[]).filter(b=>new Date(b.startTime).getHours()===hour);
                      const isToday=sameDay(day,today);
                      return (
                        <td key={day.toISOString()} className={`border-b border-r align-top p-0.5 ${isToday?"bg-primary/[0.03]":""}`}>
                          {dayBookings.map(b=>{
                            const color=STATUS_COLOR[b.status]||"bg-blue-500";
                            return (
                              <div key={b.id} className={`${color} text-white rounded px-1.5 py-0.5 mb-0.5 text-xs leading-tight cursor-default`}
                                title={`${(b as any).professionalName} — ${(b as any).roomName}\n${fmtTime(new Date(b.startTime))} - ${fmtTime(new Date(b.endTime))}\nStatus: ${STATUS_LABEL[b.status]||b.status}`}>
                                <div className="font-semibold truncate">{(b as any).professionalName}</div>
                                <div className="opacity-90 truncate">{fmtTime(new Date(b.startTime))} - {fmtTime(new Date(b.endTime))}</div>
                                {view==="day"&&<div className="opacity-80 truncate">{(b as any).roomName}</div>}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading&&(
          <p className="text-xs text-muted-foreground text-right">
            {bookings.filter(b=>b.status==="confirmed").length} reserva(s) confirmada(s) no período
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
